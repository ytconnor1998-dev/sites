// One project, two apps: the customer app (default) and the courier app (APP_VARIANT=courier).
const SITE = "https://dart-rome.expo.app";

module.exports = ({ config }) => {
  const courier = process.env.APP_VARIANT === "courier";
  return {
    ...config,
    name: courier ? "DART Courier" : "DART",
    android: { ...config.android, package: courier ? "it.dart.courier" : "it.dart.app" },
    ios: { ...config.ios, bundleIdentifier: courier ? "it.dart.courier" : "it.dart.app" },
    extra: { ...config.extra, site: SITE, screen: courier ? "courier" : "customer" },
  };
};
