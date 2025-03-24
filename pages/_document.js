// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Example meta tags with unique keys (add your own as needed) */}
        <meta name="description" content="Matatu Ads platform" key="description" />
        <meta name="keywords" content="matatu, ads, freelance" key="keywords" />
        {/* Ensure any dynamically generated tags have unique keys */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}