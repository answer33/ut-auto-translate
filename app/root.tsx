import type { MetaFunction, LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import antdStyles from 'antd/dist/antd.css';
import globalStyles from '~/styles/global.css';
import unoStyles from '~/styles/uno.css';
import Layout from '~/components/Layout/Base'

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: antdStyles },
    { rel: "stylesheet", href: globalStyles },
    { rel: "stylesheet", href: unoStyles },
  ]
}

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "New Remix App",
  viewport: "width=device-width,initial-scale=1",
});

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout>
          <Outlet />
        </Layout>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
