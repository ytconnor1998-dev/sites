import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';

// The app shows the DART web app for one role (customer or courier), full screen.
const { site, screen } = Constants.expoConfig.extra;
const START = site + '/#' + screen;
const PURPLE = '#452B94';

// Tells the page it is inside the app, so it drops the test frame.
const FLAG = 'window.DART_APP = ' + JSON.stringify(screen) + '; true;';

export default function App() {
  const web = useRef(null);
  const [back, setBack] = useState(false);
  const [failed, setFailed] = useState(false);

  // Android back button: go back in the app, or close it on the first screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (back && web.current) { web.current.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [back]);

  // Links that leave DART (maps, phone, email, WhatsApp) open in their own apps.
  const keepInside = (req) => {
    if (req.url.startsWith(site) || req.url.startsWith('about:') || req.url.startsWith('data:') || req.url.startsWith('blob:')) return true;
    Linking.openURL(req.url).catch(() => {});
    return false;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
        <StatusBar style="auto" />
        {failed ? (
          <View style={styles.center}>
            <Text style={styles.title}>No connection</Text>
            <Text style={styles.text}>Check your internet and try again.</Text>
            <Pressable style={styles.btn} onPress={() => { setFailed(false); web.current && web.current.reload(); }}>
              <Text style={styles.btnText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}
        <WebView
          ref={web}
          source={{ uri: START }}
          style={failed ? styles.hidden : styles.page}
          injectedJavaScriptBeforeContentLoaded={FLAG}
          domStorageEnabled
          javaScriptEnabled
          allowFileAccess
          geolocationEnabled
          mediaCapturePermissionGrantType="grant"
          setSupportMultipleWindows={false}
          pullToRefreshEnabled={false}
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.center, StyleSheet.absoluteFill]}>
              <ActivityIndicator size="large" color={PURPLE} />
            </View>
          )}
          onShouldStartLoadWithRequest={keepInside}
          onNavigationStateChange={(s) => setBack(s.canGoBack)}
          onError={() => setFailed(true)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  hidden: { height: 0, flex: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  title: { fontSize: 20, fontWeight: '700', color: '#1B1530', marginBottom: 6 },
  text: { fontSize: 15, color: '#5B5670', marginBottom: 20, textAlign: 'center' },
  btn: { backgroundColor: PURPLE, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
