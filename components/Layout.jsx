import Head from "next/head";
import Link from "next/link";

export default function Layout({ children }) {
  return (
    <div>
      <Head>
        <title>
          Add subtitles to videos using google video intelligence and cloudinary
        </title>
        <meta
          name="description"
          content=" Add subtitles to videos using google video intelligence and cloudinary"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <nav>
        <ul>
          <li>
            <Link href="/">
              <a className="btn">Home</a>
            </Link>
          </li>
          <li>
            <Link href="/videos">
              <a className="btn">Videos</a>
            </Link>
          </li>
        </ul>
      </nav>
      <main>{children}</main>
      <style jsx>{`
        nav {
          background-color: #f0f0f0;
          min-height: 100px;
          display: flex;
          align-items: center;
        }

        nav ul {
          list-style: none;
          padding: 0 32px;
          flex: 1;
          display: flex;
          flex-flow: row nowrap;
          justify-content: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
