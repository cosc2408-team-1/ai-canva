//#region node-half
/**
 * Sessions Monitor plugin, node half. Pure UI plugin: the empty apply exists
 * so the plugin appears in the host cordis.yml / Loader; the browser half
 * ships via exports["./client"], discovered through this package's
 * `dsh.client` declaration (`dsh.client.platform: "web"`).
 */

/** Host plugin body — no host-side behavior for this source plugin. */
export function apply() {}
//#endregion