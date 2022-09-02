import type { MetaFunction, LinksFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link
} from "@remix-run/react";
import { Button, Result } from 'antd';
import antdStyles from 'antd/dist/antd.css';
import globalStyles from '~/styles/global.css';
import unoStyles from '~/styles/uno.css';
import Layout from '~/components/Layout/Base'

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: unoStyles },
    { rel: "stylesheet", href: antdStyles },
    { rel: "stylesheet", href: globalStyles }
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
        {process.env.NODE_ENV === "development" ? (
          <LiveReload />
        ) : null}
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <html lang='en'>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Layout>
          <Result
            status='warning'
            title='There are some problems with your operation.'
            extra={
              <Link to='/'>
                <Button type='primary'>Back Home</Button>
              </Link>
            }
          />
        </Layout>

        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === 'development' && <LiveReload />}
      </body>
    </html>
  );
}