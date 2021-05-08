<?php
/**
 * Robo Deployment
 *
 * Notifications live on same servers as 
 * other php projects.  If we transfer somewhere 
 * else, we should make this in js / bash.
 */
class RoboFile extends \Robo\Tasks
{

	public $env = array();
	public $file_diff = array();

	public function __construct() {

		// Path constants
		define('DS', DIRECTORY_SEPARATOR);
		define('ROOT', dirname(__FILE__));

		// Load env file
		$this->env = $this->__env_parser();

		// User constants
		define('USER', trim(shell_exec('whoami 2>/dev/null')));
		define('NODE_USER', (!empty(trim(shell_exec('id -u node 2>/dev/null'))) ? 'node' : USER));

		// Service constants
		define('SUDO', trim(shell_exec('which /usr/bin/sudo 2>/dev/null')));
		define('PM2', trim(shell_exec('which /usr/bin/pm2 2>/dev/null')));
	}

	/**
	 * Update
	 *
	 * @example commandline:$ bin/robo update --branch=master
	 *
	 * @param array $opts Arguments for update.
	 * @return void
	 */
	public function update($opts = [
		'branch' => '',
		'watch' => false
	]) {

		$this->say('Running Update in ' . ROOT);
		$this->say('Current User: ' . USER);
		$this->say('Node User: ' . NODE_USER);
		$this->say('PM2 Service: ' . PM2);

		// Update Project from Git
		$git_log = $this->__gitUpdate($opts['branch']);

		// Npm install
		$this->__npmInstall();

		// Set newrelic log writable
		$newrelic_log = ROOT . DS . 'newrelic_agent.log';

		$this->taskFilesystemStack()
			->touch($newrelic_log)
			->chgrp($newrelic_log, NODE_USER)
			->chmod($newrelic_log, 0664)
			->run();

		$logs = ROOT . DS . 'log' . DS;

		$this->taskFilesystemStack()
			->chgrp($logs, NODE_USER)
			->chown($logs, USER)
			->chmod($logs, 0775)
			->run();

		// Start PM2 service
		if (!empty(PM2)) {
			$this->__startServer($opts['watch']);
		}
		else {
			$this->say("\e[33mSkipping: Server start (PM2 service not found)\e[39m");
		}

		// Deployment log
		$server_hostname = php_uname('n');
		$server_os = (php_uname('s') . ' ' . php_uname('r') . ' ' . php_uname('m'));
		$php_version = phpversion();
		$build_date = date("Y-m-d H:i:s");
		$base_dir = ROOT;

		$deployment_log = trim(preg_replace('/\t/', '', "
			UPDATED: $base_dir
			DATE:    $build_date
			=======================================================
			\e[94m$git_log\e[39m
			=======================================================
			Host: $server_hostname
			OS: $server_os
			PHP: $php_version
		"));

		// Show log
		echo "\n$deployment_log\n";
	}

	/**
	 * Update Git Branch
	 *
	 * @param string $branch Git branch to update
	 * @return string
	 */
	private function __gitUpdate($branch = '') {

		$current_branch = trim(shell_exec('git rev-parse --abbrev-ref HEAD'));

		// Keep current branch
		if (empty($branch) || $branch === true) {
			$branch = $current_branch;
		}

		// Save old commit hash
		$old_hash = shell_exec('git log -1 --pretty=format:%h');

		// Update only
		if ($current_branch === $branch) {

			$this->say("Update: $branch");

			// Update project
			$git_update = $this->taskGitStack()
				->stopOnFail()
				->pull('origin', $branch)
				->run();

		}
		// Switch and Update
		else {

			$this->say("Switch and Update: $current_branch -> $branch");

			// Update project
			$git_update = $this->taskGitStack()
				->stopOnFail()
				->checkout($branch)
				->pull('origin', $branch)
				->run();

		}

		// Check if $git_update was successful and display message to user
		if (!$git_update->wasSuccessful()) {
			$this->say("\e[31mERROR: Git update failed\e[39m");
			exit;
		}

		// Save new commit hash
		$new_hash = shell_exec('git log -1 --pretty=format:%h');

		// Compare old hash with new hash
		if ($old_hash !== $new_hash) {

			$changelog = shell_exec("git log --reverse --no-merges --pretty=format:%s --date=short $old_hash..$new_hash");

			// Check files changed
			exec("git log --pretty=format: --name-only $old_hash...$new_hash", $files_changed, $file_check);

			if ($file_check === 0) {
				$this->file_diff = array_filter($files_changed);
			}
		}

		// Set changelog message
		if (empty($changelog)) {
			$changelog = 'No changes.';
		}

		// Set Branch / commit log
		$log_title = "$branch ($old_hash...$new_hash)";

		if ($current_branch !== $branch) {
			$log_title = "$current_branch ($old_hash) -> $branch ($new_hash)";
		}

		return "$log_title\n$changelog";
	}

	/**
	 * NPM install dependencies
	 *
	 * @param string $dir Directory to run npm install command
	 * @return void
	 */
	private function __npmInstall($dir = ROOT) {

		$error = true;
		$install = true;

		// Test package change before install
		if (in_array('package-lock.json', $this->file_diff)) {
			$install = true;
		}

		if ($install && file_exists($dir)) {

			// Dev dependencies for local
			if (!empty($this->env['ENVIRONMENT']) && $this->env['ENVIRONMENT'] === 'local') {

				$result = $this->taskNpmInstall()
					->dir($dir)
					->arg('--no-save')
					->run();
			}

			// Skip dev dependencies for non local
			else {

				$result = $this->taskNpmInstall()
					->dir($dir)
					->noDev()
					->arg('--no-save')
					->run();
			}

			if ($result->wasSuccessful()) {
				$error = false;
			}
		}

		if ($install && $error === true) {
			$this->say("\e[31mERROR: Npm install failed\e[39m");
			exit;
		}
	}

	/**
	 * Starts PM2 server
	 *
	 * Detects if PM2 process already running for
	 * current exec_path and decides to start or
	 * restart application.
	 */
	private function __startServer($watch = false) {

		// Exit if PM2 missing
		if (!empty(SUDO) && !empty(PM2)) {

			$pm2 = SUDO . ' -u ' . NODE_USER . ' ' . PM2;
			$pm2_command = 'start';
			$pm2_env = 'production';
			$pm2_watching = false;

			$pm2_info = json_decode(shell_exec("$pm2 jlist"), true);

			// Check for running PM2 process
			if (!empty($pm2_info)) {
				foreach ($pm2_info as $pm2_process) {
					if (!empty($pm2_process['pm2_env']['pm_exec_path'])) {
						if ($pm2_process['pm2_env']['pm_exec_path'] === ROOT . DS . 'server.js') {

							// Set restart
							$pm2_command = 'restart';

							// Set watched status
							$pm2_watching = !empty($pm2_process['pm2_env']['watch']) ? $pm2_process['pm2_env']['watch'] : false;

							break;
						}
					}
				}
			}

			if (!empty($this->env['ENVIRONMENT']) && $this->env['ENVIRONMENT'] === 'local') {

				// Set dev environment
				$pm2_env = 'development';

				// Set watch if not watching
				if ($watch === true && $pm2_watching === false) {
					$pm2_env .= ' --watch';
				}

				// Set watch to turn off if watching already
				else if ($watch === false && $pm2_watching === true) {
					$pm2_env .= ' --watch';
				}
			}

			$this->taskExec("$pm2 $pm2_command pm2-single.json --env $pm2_env")->run();
		}
	}

	/**
	 * Parses the .env file in the current working folder
	 * creates an array with the data found.
	 * it ignores commented lines and differentiates between strings, ints and bools
	 *
	 * @return $env_data Contains all data collected from the .env file
	 */
	private function __env_parser($file = ROOT . DS . '.env') {

		$env_data = array();

		if (file_exists($file) && is_readable($file)) {

			// Get .env file contents
			$env = file_get_contents($file);

			// Match ENV key / values
			// * non commented lines
			// * key capitals, underscores, 0-9
			// * value after equals before newline
			if (preg_match_all('/^(?:(?!#)([A-Z_0-9]*)=(.*?))$/m', $env, $matches) !== false) {

				if (!empty($matches[0])) {

					for ($i = 0; $i < count($matches[0]); $i++) {

						if (isset($matches[1][$i]) && isset($matches[2][$i])) {

							// Strip quotes from value
							$value = str_replace(['"', "'"], '', $matches[2][$i]);

							// Test booleans / integers
							$integer_value = filter_var($value, FILTER_VALIDATE_INT);
							$boolean_value = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

							// Integer takes precident over boolean
							if ($integer_value !== false) {
								$value = $integer_value;
							}
							else if (!is_null($boolean_value)) {
								$value = $boolean_value;
							}

							// Construct associative array
							$env_data[$matches[1][$i]] = $value;
						}
					}
				}
			}
		}
		else {

			// Show error message and die hard
			$this->say('ERROR: .env file not found or not readable.');
			die();
		}

		return $env_data;
	}
}
