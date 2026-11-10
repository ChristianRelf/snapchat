import SwiftUI
import WebKit

private let startURL = URL(string: "https://www.snapchat.com/web")!

/// Desktop Safari on the same WebKit version as this device, so the user
/// agent Snapchat sees (in HTTP headers and in JS) matches the real engine.
private let desktopSafariUserAgent: String = {
    let os = ProcessInfo.processInfo.operatingSystemVersion
    return "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
        + "(KHTML, like Gecko) Version/\(os.majorVersion).\(os.minorVersion) Safari/605.1.15"
}()

private let spoofScript: String = {
    guard let url = Bundle.main.url(forResource: "spoof", withExtension: "js"),
          let source = try? String(contentsOf: url, encoding: .utf8)
    else { fatalError("spoof.js missing from app bundle") }
    return source
}()

private func isSnapchat(_ host: String?) -> Bool {
    guard let host = host?.lowercased() else { return false }
    return host == "snapchat.com" || host.hasSuffix(".snapchat.com")
}

struct SnapWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()  // persistent, so you stay logged in
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // Page world, document start, all frames: runs before any Snapchat
        // script and is not subject to the page's CSP.
        config.userContentController.addUserScript(
            WKUserScript(source: spoofScript, injectionTime: .atDocumentStart, forMainFrameOnly: false))

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.customUserAgent = desktopSafariUserAgent
        webView.allowsBackForwardNavigationGestures = true
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.load(URLRequest(url: startURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        // Keep Snapchat in the app; open other sites in Safari.
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if action.targetFrame?.isMainFrame == true, let url = action.request.url,
               url.scheme == "http" || url.scheme == "https", !isSnapchat(url.host) {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        // target="_blank" and window.open: Snapchat pages load in place,
        // everything else goes to Safari.
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url {
                if isSnapchat(url.host) {
                    webView.load(action.request)
                } else {
                    UIApplication.shared.open(url)
                }
            }
            return nil
        }

        // Camera and mic for snaps and calls: iOS asks once for the app, so
        // don't ask again per page load.
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(isSnapchat(origin.host) ? .grant : .prompt)
        }

        // The web content process can be killed in the background; reload
        // instead of showing a blank page.
        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            if !present(alert, from: webView) { completionHandler() }
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            if !present(alert, from: webView) { completionHandler(false) }
        }

        private func present(_ alert: UIAlertController, from webView: WKWebView) -> Bool {
            guard var top = webView.window?.rootViewController else { return false }
            while let presented = top.presentedViewController { top = presented }
            top.present(alert, animated: true)
            return true
        }
    }
}
