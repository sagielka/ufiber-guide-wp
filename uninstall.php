<?php
// Remove everything the plugin stored in the database.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}
delete_option( 'nufg_options' );
delete_option( 'external_updates-noga-ufiber-guide' );
delete_site_option( 'nufg_options' );
