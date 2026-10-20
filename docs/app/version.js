/* The version shown at the top of the app, so we can tell which one a device is running. The first release of a month
 * is MM.YY (10.26 = October 2026); each release after it that month adds .01, .02, .03 (10.26.01). Change it with
 * every deploy; python3 scripts/build.py checks the form. */
export const APP_VERSION = '10.26.01';
