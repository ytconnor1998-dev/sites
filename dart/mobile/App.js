import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

// The app shows the DART web app for one role (customer or courier), full screen.
const { site, screen } = Constants.expoConfig.extra;
const START = site + '/#' + screen;
const PURPLE = '#452B94';

// Tells the page it is inside the app, so it drops the test frame.
const FLAG = 'window.DART_APP = ' + JSON.stringify(screen) + '; true;';

export default function App() {
  const web = useRef(null);
  const [failed, setFailed] = useState(false);

  // Back button and back swipe: the page goes back a screen; on a main screen the app closes.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!web.current || failed) return false;
      web.current.injectJavaScript("window.ReactNativeWebView.postMessage(window.DART_BACK && window.DART_BACK() ? 'back:done' : 'back:exit'); true;");
      return true;
    });
    return () => sub.remove();
  }, [failed]);

  // Ask once, one after the other: location (nearby jobs, arrival checks, the map opening where you are),
  // then the camera, so photo buttons can open it (pickup and drop-off photos, item photos, documents).
  useEffect(() => {
    (async () => {
      try { await Location.requestForegroundPermissionsAsync(); } catch (e) {}
      if (Platform.OS === 'android') { try { await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA); } catch (e) {} }
    })();
  }, []);

  // Files from the page (invoices, statements, templates): make a PDF or a file, then open the share sheet
  // so the person can save it to Files or Drive, or send it.
  const saveFile = async (m) => {
    try {
      const safe = String(m.name || 'DART').replace(/[^\w .-]/g, '').slice(0, 80) || 'DART';
      let file;
      if (m.html) {
        const out = await Print.printToFileAsync({ html: m.html });
        file = new File(Paths.cache, safe + '.pdf');
        if (file.exists) file.delete();
        await new File(out.uri).move(file);
      } else {
        file = new File(Paths.cache, safe + '.' + (m.ext || 'txt'));
        if (file.exists) file.delete();
        file.create();
        await file.write(String(m.text || ''));
      }
      await Sharing.shareAsync(file.uri, { mimeType: m.html ? 'application/pdf' : (m.mime || 'text/plain'), dialogTitle: safe });
    } catch (err) {
      web.current && web.current.injectJavaScript("window.DART_TOAST && window.DART_TOAST(\"That couldn't be saved here.\"); true;");
    }
  };

  const onMessage = (e) => {
    const data = e.nativeEvent.data;
    if (data === 'back:exit') return BackHandler.exitApp();
    if (data && data[0] === '{') { try { const m = JSON.parse(data); if (m.type === 'file') saveFile(m); } catch (err) {} }
  };

  // Links that leave DART (maps, phone, email, WhatsApp) open in their own apps.
  const keepInside = (req) => {
    if (req.url.startsWith(site) || req.url.startsWith('about:') || req.url.startsWith('data:') || req.url.startsWith('blob:')) return true;
    Linking.openURL(req.url).catch(() => {});
    return false;
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
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
          onMessage={onMessage}
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
