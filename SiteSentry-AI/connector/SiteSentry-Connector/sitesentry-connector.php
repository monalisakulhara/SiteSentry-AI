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
/**
 * REAL BACKUP: Zips the 'wp-content/uploads' directory.
 */
function sitesentry_handle_run_backup(WP_REST_Request $request) {
    // 1. Setup paths
    $upload_dir_info = wp_upload_dir();
    $source_dir = $upload_dir_info['basedir']; // e.g., .../wp-content/uploads
    $backup_folder = $upload_dir_info['basedir'] . '/sitesentry-backups';
    
    // Create backup directory if it doesn't exist
    if (!file_exists($backup_folder)) {
        mkdir($backup_folder, 0755, true);
        // Create an empty index.php and .htaccess to hide this folder from public view
        file_put_contents($backup_folder . '/index.php', '<?php // Silence is golden');
        file_put_contents($backup_folder . '/.htaccess', 'deny from all');
    }

    $backup_filename = 'backup_' . date('Y-m-d_H-i-s') . '.zip';
    $zip_file_path = $backup_folder . '/' . $backup_filename;

    // 2. Initialize ZipArchive
    if (!class_exists('ZipArchive')) {
        return new WP_Error('missing_zip', 'ZipArchive class not found on this server.', array('status' => 500));
    }

    $zip = new ZipArchive();
    if ($zip->open($zip_file_path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        return new WP_Error('zip_error', 'Could not create zip file.', array('status' => 500));
    }

    // 3. Add files recursively (Limit to 500 files for demo performance)
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($source_dir),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    $file_count = 0;
    $limit = 500; 

    foreach ($files as $name => $file) {
        // Skip directories and the backup folder itself
        if ($file->isDir()) continue;
        if (strpos($file->getRealPath(), 'sitesentry-backups') !== false) continue;

        $file_path = $file->getRealPath();
        $relative_path = substr($file_path, strlen($source_dir) + 1);

        $zip->addFile($file_path, $relative_path);
        $file_count++;
        
        if ($file_count >= $limit) break; // Stop to prevent timeout on huge sites
    }

    $zip->close();

    // 4. Return success
    $file_size = filesize($zip_file_path);
    
    return new WP_REST_Response(array(
        'success' => true,
        'message' => "Backup successful! Archived $file_count files.",
        'size' => $file_size,
        's3Path' => $zip_file_path // In a real app, we'd upload this to S3 now
    ), 200);
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

/**
 * REAL SCAN: Checks plugins for the dangerous 'eval(' function.
 */
function sitesentry_handle_run_scan(WP_REST_Request $request) {
    $plugins_dir = WP_PLUGIN_DIR;
    
    $clean_files = 0;
    $suspicious_files = 0;
    $scanned_count = 0;
    $limit = 200; // Scan max 200 files for performance

    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($plugins_dir),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($files as $name => $file) {
        if ($scanned_count >= $limit) break;
        
        // Only scan PHP files
        if (pathinfo($file, PATHINFO_EXTENSION) !== 'php') continue;

        $content = file_get_contents($file->getRealPath());
        
        // Check for "eval(" which is often (but not always) malicious
        if (strpos($content, 'eval(') !== false) {
            $suspicious_files++;
        } else {
            $clean_files++;
        }
        $scanned_count++;
    }

    return new WP_REST_Response(array(
        'success' => true,
        'message' => "Scan complete. Checked $scanned_count files.",
        'cleanFiles' => $clean_files,
        'infectedFiles' => 0, // We assume 0 confirmed malware for now
        'suspiciousFiles' => $suspicious_files
    ), 200);
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