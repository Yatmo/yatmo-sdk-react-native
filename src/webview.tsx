import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';
import type { YatmoClient, YatmoPluginOptions } from './client';

export interface YatmoWebViewProps extends YatmoPluginOptions {
  client: YatmoClient;
  style?: StyleProp<ViewStyle>;
  /** Extra props forwarded to react-native-webview. */
  webViewProps?: Omit<WebViewProps, 'source' | 'style'>;
}

/**
 * The Yatmo iframe plugin (map, summary panel, scores, tabs) inside `react-native-webview`.
 * Import from `@yatmo/react-native/webview` so apps without the WebView dependency are not affected.
 */
export function YatmoWebView({ client, style, webViewProps, ...options }: YatmoWebViewProps) {
  return (
    <WebView
      source={{ uri: client.pluginUrl(options) }}
      style={style}
      javaScriptEnabled
      domStorageEnabled
      bounces={false}
      {...webViewProps}
    />
  );
}
