// One project, two apps: the customer app (default) and the courier app (APP_VARIANT=courier).
const SITE = "https://dart-rome.expo.app";

module.exports = ({ config }) => {
  const courier = process.env.APP_VARIANT === "courier";
  return {
    ...config,
    name: courier ? "DART Courier" : "DART",
    android: {
      ...config.android,
      package: courier ? "it.dart.courier" : "it.dart.app",
      permissions: [...config.android.permissions, "android.permission.ACCESS_FINE_LOCATION", "android.permission.ACCESS_COARSE_LOCATION"],
    },
    plugins: [["expo-location", { locationWhenInUsePermission: courier ? "DART Courier uses your location to send you nearby deliveries and to check you're at each pickup and drop-off." : "DART uses your location to open the map where you are and to help you set a pickup address." }]],
    ios: { ...config.ios, bundleIdentifier: courier ? "it.dart.courier" : "it.dart.app" },
    extra: { ...config.extra, site: SITE, screen: courier ? "courier" : "customer" },
  };
};
