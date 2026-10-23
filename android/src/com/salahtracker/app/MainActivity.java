package com.salahtracker.app;

// Salah Tracker for Android: opens the live site (https://prayertracker.web.app) full screen.
// Everything published to the website shows up here straight away; the app only adds the phone things
// a browser page can't do on its own: saving certificates, printing, sharing, WhatsApp links and the Back button.

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
    static final String HOME = "https://prayertracker.web.app/";
    WebView web;
    WebView printView;   // kept alive while printing

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        Window w = getWindow();
        w.setStatusBarColor(Color.parseColor("#2E9BF0"));
        w.setNavigationBarColor(Color.WHITE);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#F3F6FC"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);          // links that open "a new tab" load here, so we can route them
        s.setUserAgentString(s.getUserAgentString() + " SalahTrackerApp/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.addJavascriptInterface(new Bridge(), "AndroidApp");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (isOurs(u)) return false;
                openOutside(u);          // WhatsApp invites, other websites, email…
                return true;
            }
            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame()) view.loadData(OFFLINE, "text/html", "UTF-8");
            }
        });

        if (saved != null) web.restoreState(saved);
        else web.loadUrl(startUrl(getIntent()));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri u = intent.getData();
        if (u != null && isOurs(u)) web.loadUrl(u.toString());   // e.g. a Salah Buddy invite link
    }

    String startUrl(Intent intent) {
        Uri u = intent != null ? intent.getData() : null;
        return u != null && isOurs(u) ? u.toString() : HOME;
    }

    static boolean isOurs(Uri u) {
        String scheme = u.getScheme(), host = u.getHost();
        if (scheme == null) return false;
        if (scheme.equals("about") || scheme.equals("data") || scheme.equals("blob")) return true;
        if (host == null) return false;
        return host.equals("prayertracker.web.app") || host.equals("kids-salah-tracker.web.app")
            || host.endsWith(".firebaseapp.com") || host.endsWith("googleapis.com") || host.endsWith("gstatic.com");
    }

    void openOutside(Uri u) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, u);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (ActivityNotFoundException e) {
            toast(u.toString().startsWith("https://wa.me") ? "WhatsApp isn't installed on this phone." : "No app on this phone can open that link.");
        }
    }

    // Back: close an open window in the app first, then go to the previous page, then leave the app.
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.__appBack && window.__appBack()) ? 'yes' : 'no'", new android.webkit.ValueCallback<String>() {
            @Override public void onReceiveValue(String res) {
                if (res != null && res.contains("yes")) return;
                if (web.canGoBack()) web.goBack();
                else finish();
            }
        });
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { super.onPause(); web.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }

    void toast(final String msg) {
        runOnUiThread(new Runnable() { @Override public void run() { Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show(); } });
    }

    // What the page can call as window.AndroidApp.*
    class Bridge {
        // Save a file (certificate PDF or picture) into the phone's Downloads folder.
        @JavascriptInterface
        public void saveFile(String base64, String mime, String name) {
            try {
                byte[] data = Base64.decode(base64, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                    v.put(MediaStore.Downloads.MIME_TYPE, mime);
                    v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Salah Tracker");
                    Uri item = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    try (OutputStream out = getContentResolver().openOutputStream(item)) { out.write(data); }
                    toast("Saved in Downloads › Salah Tracker: " + name);
                } else {
                    File dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "Salah Tracker");
                    dir.mkdirs();
                    File f = new File(dir, name);
                    try (FileOutputStream out = new FileOutputStream(f)) { out.write(data); }
                    toast("Saved: " + f.getAbsolutePath());
                }
            } catch (Exception e) {
                toast("Couldn't save the file. Try again.");
            }
        }

        // Print a picture (the certificate) through Android's printing (or "Save as PDF").
        @JavascriptInterface
        public void printImage(final String base64Png, final String title) {
            runOnUiThread(new Runnable() { @Override public void run() {
                printView = new WebView(MainActivity.this);
                printView.setWebViewClient(new WebViewClient() {
                    @Override public void onPageFinished(WebView v, String url) {
                        PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                        PrintDocumentAdapter ad = v.createPrintDocumentAdapter(title);
                        pm.print(title, ad, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4.asLandscape()).build());
                    }
                });
                String html = "<html><head><style>@page{size:A4 landscape;margin:0}html,body{margin:0}img{width:100%;height:auto;display:block}</style></head>"
                    + "<body><img src='data:image/png;base64," + base64Png + "'></body></html>";
                printView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            }});
        }

        // Share text (e.g. a Salah Buddy invite) with WhatsApp or any other app.
        @JavascriptInterface
        public void share(String text) {
            Intent i = new Intent(Intent.ACTION_SEND);
            i.setType("text/plain");
            i.putExtra(Intent.EXTRA_TEXT, text);
            Intent chooser = Intent.createChooser(i, "Share with");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(chooser);
        }

        @JavascriptInterface
        public String version() { return "1.0"; }
    }

    static final String OFFLINE = "<html><body style=\"font-family:sans-serif;background:#F3F6FC;color:#22204A;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center\">"
        + "<div><div style=\"font-size:64px\">🌙</div><h2>No internet</h2><p>Salah Tracker needs the internet.<br>Check Wi-Fi or mobile data.</p>"
        + "<button style=\"font-size:18px;padding:12px 24px;border:none;border-radius:14px;background:#D93A62;color:#fff\" onclick=\"location.href='" + HOME + "'\">Try again</button></div></body></html>";
}
