<?php
/**
 * AI spend accounting. The token counts must be exactly what the API reported,
 * and the money must never be invented for a model whose rate we do not know.
 * Run with: php tests/spend.test.php
 */

define( 'ABSPATH', __DIR__ );
$GLOBALS['opt'] = array();
function wp_salt( $s = '' ) { return 'salt-' . $s; }
function get_option( $k, $d = '' ) { return isset( $GLOBALS['opt'][ $k ] ) ? $GLOBALS['opt'][ $k ] : $d; }
function update_option( $k, $v, $a = null ) { $GLOBALS['opt'][ $k ] = $v; return true; }
function add_action() {}
function register_rest_route() {}
function __( $s, $d = '' ) { return $s; }

require __DIR__ . '/../includes/class-ai.php';

$pass = 0; $fail = 0;
function ok( $name, $cond, $detail = null ) {
	global $pass, $fail;
	if ( $cond ) { $pass++; echo "PASS $name\n"; }
	else { $fail++; echo "FAIL $name" . ( null === $detail ? '' : '  → ' . var_export( $detail, true ) ) . "\n"; }
}
$rec = new ReflectionMethod( 'NUFG_AI', 'record' );
$rec->setAccessible( true );
$price = new ReflectionMethod( 'NUFG_AI', 'price' );
$price->setAccessible( true );

$reply = function ( $model, $in, $out ) {
	return array( 'model' => $model, 'usage' => array( 'input_tokens' => $in, 'output_tokens' => $out ) );
};

/* ---- the counts are the API's, not ours ---- */
$GLOBALS['opt'] = array();
$rec->invoke( null, $reply( 'claude-haiku-5-5', 11000, 400 ), 'read' );
$rec->invoke( null, $reply( 'claude-haiku-5-5', 12000, 600 ), 'chat' );
$s = NUFG_AI::spend();
ok( 'both requests are counted', 2 === $s['calls'], $s['calls'] );
ok( 'input tokens add up exactly', 23000 === $s['in'], $s['in'] );
ok( 'output tokens add up exactly', 1000 === $s['out'], $s['out'] );
ok( 'readings and chats are counted apart', 1 === $s['reads'] && 1 === $s['chats'], array( $s['reads'], $s['chats'] ) );

/* ---- the money follows the published rate ---- */
// Haiku 5.5: $0.10 per M in, $0.50 per M out → 0.023 * 0.10 + 0.001 * 0.50
$expect = ( 23000 / 1000000 ) * 0.10 + ( 1000 / 1000000 ) * 0.50;
ok( 'the estimate matches the published rate', abs( $s['cost'] - $expect ) < 0.0000001, array( $s['cost'], $expect ) );
ok( 'nothing is flagged as unpriced', ! $s['cost_partial'] );

/* ---- cached and cache-written input is still input ---- */
$GLOBALS['opt'] = array();
$rec->invoke( null, array( 'model' => 'claude-haiku-5-5', 'usage' => array(
	'input_tokens' => 100, 'cache_creation_input_tokens' => 900, 'cache_read_input_tokens' => 2000, 'output_tokens' => 50 ) ), 'read' );
$s = NUFG_AI::spend();
ok( 'cache tokens are counted as input', 3000 === $s['in'], $s['in'] );

/* ---- an unknown model is counted but not costed ---- */
$GLOBALS['opt'] = array();
$rec->invoke( null, $reply( 'some-model-we-do-not-know', 50000, 5000 ), 'read' );
$s = NUFG_AI::spend();
ok( 'an unknown model still has its tokens counted', 50000 === $s['in'], $s['in'] );
ok( 'an unknown model is not given an invented price', 0.0 === $s['cost'], $s['cost'] );
ok( 'and the screen is told the figure is incomplete', $s['cost_partial'] );

/* ---- two models in one month are costed separately ---- */
$GLOBALS['opt'] = array();
$rec->invoke( null, $reply( 'claude-haiku-5-5', 1000000, 0 ), 'read' );
$rec->invoke( null, $reply( 'claude-sonnet-5-5', 1000000, 0 ), 'chat' );
$s = NUFG_AI::spend();
ok( 'each model is costed at its own rate', abs( $s['cost'] - ( 0.10 + 2.00 ) ) < 0.0000001, $s['cost'] );

/* ---- a reply with no usage block changes nothing ---- */
$GLOBALS['opt'] = array();
$rec->invoke( null, array( 'model' => 'claude-haiku-5-5' ), 'read' );
ok( 'a reply without a usage block is ignored', null === NUFG_AI::spend() );

/* ---- the option cannot grow without limit ---- */
$GLOBALS['opt'] = array();
$big = array();
for ( $y = 2020; $y < 2026; $y++ ) {
	for ( $m = 1; $m <= 12; $m++ ) {
		$big[ sprintf( '%d-%02d', $y, $m ) ] = array( 'calls' => 1, 'in' => 1, 'out' => 1, 'models' => array(), 'reads' => 1, 'chats' => 0 );
	}
}
$GLOBALS['opt']['nufg_ai_spend'] = $big;
$rec->invoke( null, $reply( 'claude-haiku-5-5', 10, 10 ), 'read' );
ok( 'old months are dropped past thirteen', count( $GLOBALS['opt']['nufg_ai_spend'] ) <= 13, count( $GLOBALS['opt']['nufg_ai_spend'] ) );
ok( 'this month survives the trim', isset( $GLOBALS['opt']['nufg_ai_spend'][ gmdate( 'Y-m' ) ] ) );

/* ---- the rates themselves ---- */
ok( 'the Haiku 5.5 rate is the published one', $price->invoke( null, 'claude-haiku-5-5' ) === array( 0.10, 0.50 ) );
ok( 'a versioned model name still matches its rate', $price->invoke( null, 'claude-haiku-5-5-20260101' ) === array( 0.10, 0.50 ) );
ok( 'an unknown model has no rate', null === $price->invoke( null, 'gpt-something' ) );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
