<?php
/**
 * Settings tests: storing the API key, and the paste handling around it.
 * Every case is a way a real paste arrived and was wrongly refused, or wrongly
 * accepted. Run with: php tests/key.test.php
 */

define( 'ABSPATH', __DIR__ );
$GLOBALS['opt']  = array();
$GLOBALS['errs'] = array();

function wp_salt( $s = '' ) { return 'test-salt-' . $s; }
function get_option( $k, $d = '' ) { return isset( $GLOBALS['opt'][ $k ] ) ? $GLOBALS['opt'][ $k ] : $d; }
function add_action() {}
function register_rest_route() {}
function register_setting() {}
function add_settings_error( $a, $b, $m ) { $GLOBALS['errs'][] = $m; }
function __( $s, $d = '' ) { return $s; }

require __DIR__ . '/../includes/class-ai.php';

// save_key lives in the settings class, which pulls in the whole admin page.
// Lift just that method out so the test stays about the logic.
$src = file_get_contents( __DIR__ . '/../includes/class-settings.php' );
preg_match( '/public static function save_key\( \$v \) \{.*?\n\t\}/s', $src, $m );
eval( 'function save_key($v) {' . substr( $m[0], strpos( $m[0], '{' ) + 1 ) );

$pass = 0;
$fail = 0;
function ok( $name, $cond, $detail = null ) {
	global $pass, $fail;
	if ( $cond ) { $pass++; echo "PASS $name\n"; }
	else { $fail++; echo "FAIL $name" . ( null === $detail ? '' : '  → ' . var_export( $detail, true ) ) . "\n"; }
}

// A fixture, not a credential: same prefix and length, nothing behind it.
$KEY = 'sk-ant-usr-EXAMPLE_NOT_A_REAL_KEY_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

function fresh() { $GLOBALS['opt'] = array(); $GLOBALS['errs'] = array(); $_POST = array(); }
function stored_key( $stored ) {
	$GLOBALS['opt']['nufg_ai_key'] = $stored;
	$m = new ReflectionMethod( 'NUFG_AI', 'key' );
	$m->setAccessible( true );
	return $m->invoke( null );
}

/* ---- a key survives every way a paste actually arrives (1.3.3, 1.3.6) ---- */
$pastes = array(
	'a clean paste'              => $KEY,
	'a trailing newline'         => $KEY . "\n",
	'wrapped over two lines'     => substr( $KEY, 0, 62 ) . "\n" . substr( $KEY, 62 ),
	'smart quotes around it'     => '“' . $KEY . '”',
	'the whole define(...) line' => "define( 'NUFG_CLAUDE_API_KEY', '" . $KEY . "' );",
	'copied from the curl line'  => '--header "x-api-key: ' . $KEY . '" \\',
	'a zero-width character'     => "\xE2\x80\x8B" . $KEY,
	'a non-breaking space'       => "\xC2\xA0" . $KEY . "\xC2\xA0",
	'a byte that is not UTF-8'   => "\xFF" . $KEY,
);
foreach ( $pastes as $label => $paste ) {
	fresh();
	ok( "the key survives $label", stored_key( save_key( $paste ) ) === $KEY );
}

/* ---- what must not be accepted as a key (1.3.6) ---- */
fresh();
$err = 'HTTP 401. Anthropic rejected the key. Check it was copied whole and has not been deleted in the console.';
ok( 'the error message shown above the box is not a key', '' === save_key( $err ) && $GLOBALS['errs'] );
fresh();
ok( 'a WordPress password is not a key', '' === save_key( 'Noga!2026#site' ) && $GLOBALS['errs'] );

/* ---- an existing key is not lost by a bad paste (1.3.2) ---- */
fresh();
$GLOBALS['opt']['nufg_ai_key'] = NUFG_AI::encrypt( $KEY );
ok( 'a bad paste keeps the key already saved', stored_key( save_key( 'oops wrong text' ) ) === $KEY );
fresh();
$GLOBALS['opt']['nufg_ai_key'] = NUFG_AI::encrypt( $KEY );
ok( 'an empty box keeps the key already saved', stored_key( save_key( '' ) ) === $KEY );

/* ---- removing it is a checkbox (1.3.8) ---- */
fresh();
$GLOBALS['opt']['nufg_ai_key'] = NUFG_AI::encrypt( $KEY );
$_POST = array( 'nufg_ai_key_clear' => '1' );
ok( 'the checkbox removes the key with an empty box', '' === save_key( '' ) );
fresh();
$GLOBALS['opt']['nufg_ai_key'] = NUFG_AI::encrypt( $KEY );
$_POST = array( 'nufg_ai_key_clear' => '1' );
ok( 'the checkbox wins over a key typed at the same time', '' === save_key( $KEY ) );

/* ---- the stored form gives nothing away (1.3.1) ---- */
fresh();
$enc = NUFG_AI::encrypt( $KEY );
ok( 'the stored value contains no part of the key', false === strpos( $enc, substr( $KEY, 11, 20 ) ) );
ok( 'the stored value is marked with its version', 0 === strpos( $enc, 'v1:' ) );
$GLOBALS['opt']['nufg_ai_key'] = $enc;
ok( 'the hint shows four characters, not the key', NUFG_AI::key_hint() === '…' . substr( $KEY, -4 ) );

$d = new ReflectionMethod( 'NUFG_AI', 'decrypt' );
$d->setAccessible( true );
ok( 'garbage in the option reads as no key', '' === $d->invoke( null, 'v1:zzzz' ) );
ok( 'an empty option reads as no key', '' === $d->invoke( null, '' ) );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
