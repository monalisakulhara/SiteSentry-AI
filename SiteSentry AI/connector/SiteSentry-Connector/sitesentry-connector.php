<?php
/**
 * Plugin Name:       SiteSentry AI Connector
 * Plugin URI:        https://example.com/sitesentry-connector/
 * Description:       Connects your WordPress site to the SiteSentry AI dashboard for automated maintenance and security.
 * Version:           1.0.0
 * Author:            Your Name Here
 * Author URI:        https://example.com/
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       sitesentry-connector
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

/**
 * Define constants for the plugin
 */
define('SITESENTRY_CONNECTOR_VERSION', '1.0.0');
define('SITESENTRY_CONNECTOR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('SITESENTRY_CONNECTOR_PLUGIN_URL', plugin_dir_url(__FILE__));
/**
 * Ensure necessary file system functions are loaded for the REST API.
 * This fixes the "Call to undefined function wp_tempnam()" error.
 */
if (!function_exists('wp_tempnam')) {
    // We use the ABSPATH constant which points to the WordPress root directory
    require_once(ABSPATH . 'wp-admin/includes/file.php');
}
// --- Main Plugin Code will go here ---

/**
 * Register custom REST API endpoints for SiteSentry AI.
 */
add_action('rest_api_init', function () {
    // Define the "namespace" for our routes (like a folder)
    $namespace = 'sitesentry/v1';

    // --- 1. Test Connection Route ---
    register_rest_route($namespace, '/test-connection', array(
        'methods' => 'POST', // Only allow POST requests
        'callback' => 'sitesentry_handle_test_connection',
        'permission_callback' => 'sitesentry_check_api_key', // Security check!
    ));

    // --- 2. Run Backup Route ---
    register_rest_route($namespace, '/run-backup', array(
        'methods' => 'POST',
        'callback' => 'sitesentry_handle_run_backup',
        'permission_callback' => 'sitesentry_check_api_key', // Security check!
    ));

    // --- 3. Run Scan Route (Placeholder) ---
     register_rest_route($namespace, '/run-scan', array(
         'methods' => 'POST',
         'callback' => 'sitesentry_handle_run_scan',
         'permission_callback' => 'sitesentry_check_api_key',
     ));

    // --- 4. Run Update Route (Placeholder) ---
     register_rest_route($namespace, '/run-update', array(
         'methods' => 'POST',
         'callback' => 'sitesentry_handle_run_update',
         'permission_callback' => 'sitesentry_check_api_key',
     ));

     // --- 5. Run Rollback Route (Placeholder) ---
     register_rest_route($namespace, '/run-rollback', array(
         'methods' => 'POST',
         'callback' => 'sitesentry_handle_run_rollback',
         'permission_callback' => 'sitesentry_check_api_key',
     ));
     // --- NEW ROUTE FOR AI EXECUTION ---
     register_rest_route($namespace, '/ai-execute', array(
         'methods' => 'POST', // Must accept POST data (the command JSON)
         'callback' => 'sitesentry_handle_ai_execution', // The function that runs the command
         'permission_callback' => 'sitesentry_check_api_key', // CRITICAL: Use the same API key check
     ));

});

/**
 * Security Check: Verify the API Key sent from the dashboard.
 *
 * @param WP_REST_Request $request Full data about the request.
 * @return bool|WP_Error True if the API key is valid, WP_Error otherwise.
 */
function sitesentry_check_api_key(WP_REST_Request $request) {
    $provided_key = $request->get_param('apiKey'); // Get apiKey from the POST data
    
    // TODO: In a real plugin, you would save a secret key in the WordPress settings
    // and compare against that saved key. For now, we'll use a placeholder.
    $stored_key = 'test_key_12345'; // !! Change this later

    if (empty($provided_key) || $provided_key !== $stored_key) {
        return new WP_Error('rest_forbidden', esc_html__('Invalid API Key.', 'sitesentry-connector'), array('status' => 403));
    }
    
    // Key is valid, allow access
    return true;
}

/**
 * Handle the /test-connection request.
 *
 * @param WP_REST_Request $request Full data about the request.
 * @return WP_REST_Response Response object.
 */
function sitesentry_handle_test_connection(WP_REST_Request $request) {
    // If we reach here, the API key was valid (checked by permission_callback)
    return new WP_REST_Response(array(
        'success' => true,
        'message' => 'Connection successful!',
        'wp_version' => get_bloginfo('version'),
        'php_version' => phpversion(),
    ), 200);
}

/**
 * Handle the /run-backup request.
 *
 * @param WP_REST_Request $request Full data about the request.
 * @return WP_REST_Response Response object.
 */
function sitesentry_handle_run_backup(WP_REST_Request $request) {
    error_log('[SiteSentry Debug] Entering sitesentry_handle_run_backup...'); // Log entry
    try {
        $backup_file_name = 'backup_' . date('Y-m-d_H-i-s') . '.zip';
        error_log('[SiteSentry Debug] Backup file name: ' . $backup_file_name);

        // Debug wp_tempnam
        $temp_file_path = wp_tempnam($backup_file_name);
        if ($temp_file_path === false) {
             error_log('[SiteSentry Debug] ERROR: wp_tempnam failed to create a temporary file.');
             throw new Exception("Failed to create temporary backup file.");
        }
        error_log('[SiteSentry Debug] Temporary file path created: ' . $temp_file_path);

        // Debug file_put_contents
        $write_result = file_put_contents($temp_file_path, 'This is a simulated backup file content.');
         if ($write_result === false) {
             error_log('[SiteSentry Debug] ERROR: file_put_contents failed to write to temporary file.');
             @unlink($temp_file_path); // Attempt cleanup
             throw new Exception("Failed to write to temporary backup file.");
         }
        error_log('[SiteSentry Debug] Successfully wrote content to temporary file.');

        // Debug filesize
        // Clear file status cache before checking size
        clearstatcache(true, $temp_file_path);
        $file_size = filesize($temp_file_path);
        if ($file_size === false) {
            error_log('[SiteSentry Debug] ERROR: filesize failed to get size of temporary file.');
             @unlink($temp_file_path); // Attempt cleanup
            throw new Exception("Failed to get size of temporary backup file.");
        }
        error_log('[SiteSentry Debug] Temporary file size: ' . $file_size);


        // --- IMPORTANT: S3 Upload Logic Placeholder ---
        // $s3Path = 'backups/client_123/' . $backup_file_name; // Simulate S3 path
        // --- End Placeholder ---

        // Debug unlink
        $unlink_result = @unlink($temp_file_path);
        if ($unlink_result === false) {
            error_log('[SiteSentry Debug] WARNING: Failed to delete temporary file: ' . $temp_file_path);
            // Don't throw an error, just log a warning.
        } else {
             error_log('[SiteSentry Debug] Successfully deleted temporary file.');
        }


        return new WP_REST_Response(array(
            'success' => true,
            'message' => 'Simulated backup completed.',
            'size' => $file_size ?? 0, // Use actual size or 0 if failed
            's3Path' => 'simulation/path/' . $backup_file_name // Return simulated S3 path
        ), 200);

    } catch (Exception $e) {
        // Log the exception caught within this function
        error_log('[SiteSentry Debug] EXCEPTION in sitesentry_handle_run_backup: ' . $e->getMessage());
        // Return a WP_Error which WordPress REST API handles correctly
        return new WP_Error('backup_failed', esc_html__('Backup failed: ', 'sitesentry-connector') . $e->getMessage(), array('status' => 500));
    }
}
/**
 * Handle the /ai-execute request to run AI-generated commands.
 *
 * This function processes a structured JSON command sent by the Node.js backend
 * (e.g., {"action": "create_post", "title": "New Post"}) and executes the WP action.
 *
 * @param WP_REST_Request $request Full data about the request.
 * @return WP_REST_Response Response object.
 */
function sitesentry_handle_ai_execution(WP_REST_Request $request) {
    // The structured command is passed in the request body
    $command = $request->get_param('command');

    if (empty($command) || !is_array($command) || !isset($command['action'])) {
        return new WP_Error('ai_invalid_command', esc_html__('Invalid or missing command structure.', 'sitesentry-connector'), array('status' => 400));
    }

    $action = $command['action'];
    $response_message = '';

    try {
        switch ($action) {
            case 'update_option':
                // Handles commands like {"action": "update_option", "key": "business_hours", "value": "9am-6pm"}
                if (isset($command['key']) && isset($command['value'])) {
                    // This is the actual WordPress function to change a site setting
                    update_option($command['key'], $command['value']);
                    $response_message = "Successfully updated site setting: " . esc_html($command['key']);
                } else {
                    throw new Exception("Missing key or value for update_option.");
                }
                break;

            case 'create_post':
                // Handles commands like {"action": "create_post", "title": "New Holiday Sale Post", "content": "..."}
                if (isset($command['title'])) {
                    $post_id = wp_insert_post(array(
                        'post_title' => $command['title'],
                        'post_content' => $command['content'] ?? 'This post was created by SiteSentry AI.',
                        'post_status' => 'draft', // Save as draft for safety
                        'post_type' => 'post'
                    ), true);

                    if (is_wp_error($post_id)) {
                        throw new Exception("WordPress failed to insert post: " . $post_id->get_error_message());
                    }
                    $response_message = "Successfully created new post (ID: " . $post_id . ") in Draft status.";
                } else {
                    throw new Exception("Missing post title for create_post.");
                }
                break;

            default:
                throw new Exception("Unknown AI action: " . $action);
        }
    } catch (Exception $e) {
        return new WP_Error('ai_execution_failed', esc_html__('AI Command Failed: ', 'sitesentry-connector') . $e->getMessage(), array('status' => 500));
    }

    // Success response
    return new WP_REST_Response(array(
        'success' => true,
        'message' => $response_message,
        'action' => $action
    ), 200);
}


// --- Placeholder functions for other routes ---

function sitesentry_handle_run_scan(WP_REST_Request $request) {
    $signatures = $request->get_param('signatures'); // Get signatures from request
    // TODO: Add file scanning logic here
    return new WP_REST_Response(array('success' => true, 'message' => 'Scan started (simulation).', 'cleanFiles' => 500, 'infectedFiles' => 0, 'suspiciousFiles' => 0), 200);
}

function sitesentry_handle_run_update(WP_REST_Request $request) {
    $component = $request->get_param('component'); // e.g., 'plugin'
    $name = $request->get_param('name');       // e.g., 'akismet'
    // TODO: Add WP update logic here (use Core Update API)
    return new WP_REST_Response(array('success' => true, 'message' => "Update simulated for {$component}: {$name}."), 200);
}

function sitesentry_handle_run_rollback(WP_REST_Request $request) {
    // TODO: Add logic to restore from a previous backup (complex!)
    return new WP_REST_Response(array('success' => true, 'message' => 'Rollback simulated.'), 200);
}

?>