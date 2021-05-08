'use strict'

/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name: ['notify.easymarkets.com'],
  /**
   * Your New Relic license key.
   */
  license_key: '5ddd8018e46b9ccdbfa2ca23c2e3f5ef1ad0b305',
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: 'info'
  },
  rules : {
    ignore : [
    	'^\/socket\.io\/.*\/xhr-polling'
    ]
  }
}
