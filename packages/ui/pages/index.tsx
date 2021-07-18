import Editor from '@monaco-editor/react';
import lzstring from 'lz-string';
import Head from 'next/head';
import React, { useRef, useState } from 'react';
import Footer from '../components/Footer';
import Header from '../components/Header';
import Loading from '../components/Loading';
import Toolbar from '../components/Toolbar';
import fmt from '../services/fmt';
import format from '../services/formatter';
import { getExampleSourceCode } from '../services/request';
import run from '../services/run';
import styles from '../styles/Home.module.scss';

export default function Home(): JSX.Element {
  const [sourceCode, setSourceCode] = useState<string>('');
  const [console, setConsole] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const sanitizeHelper = useRef<HTMLParagraphElement | null>(null);

  async function handleEditorDidMount() {
    const [_, hash] = window.location.hash.split('#');
    const params = new URLSearchParams(hash);
    const compressedCode = params.get('code');
    let code = '';
    if (compressedCode) {
      code = lzstring.decompressFromEncodedURIComponent(compressedCode) || '';
    } else {
      code = await getExampleSourceCode('default');
    }
    setSourceCode(code);
  }

  function handleEditorChange(value: string | undefined) {
    const newSourceCode = value || '';
    setSourceCode(newSourceCode);

    // update URL fragment with the compressed source code
    if (newSourceCode) {
      const hash = newSourceCode
        ? `#code=${lzstring.compressToEncodedURIComponent(newSourceCode)}`
        : '';
      window.history.replaceState({}, '', hash);
      return;
    }
    window.history.replaceState({}, '', '#');
  }

  async function handleRun() {
    setProcessing(true);
    const response = await run(sourceCode);
    setConsole(response);
    setProcessing(false);
  }

  async function handleFormat() {
    setProcessing(true);
    let response = '';
    try {
      response = await fmt(sourceCode);
      setSourceCode(response);
    } catch (_err) {
      setConsole(response);
    } finally {
      setProcessing(false);
    }
  }

  function loadExample(exampleSourceCode: string) {
    setSourceCode(exampleSourceCode);
  }

  function createSafeMarkup(): { __html: string } {
    const sanitizer = sanitizeHelper.current;
    if (!sanitizer) {
      return { __html: '' };
    }
    sanitizer.innerText = console;
    return { __html: format(sanitizer.innerHTML) };
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>
          Deno Playground - An online playground for expolring Deno and
          TypeScript
        </title>
        <link rel="icon" href="/favicon.ico" />

        <meta name="author" content="Peter Bartha" />
        <meta
          name="description"
          content="The Playground lets you write TypeScript online in a safe and sharable way on Deno runtime."
        />
        <meta
          property="og:title"
          content="Deno Playground - An online playground for expolring Deno and TypeScript"
        />
        <meta
          property="og:description"
          content="The Playground lets you write TypeScript online in a safe and sharable way on Deno runtime."
        />
        <meta
          property="og:image"
          content="https://deno-playground-peterbartha.vercel.app/deno-og-image.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
      </Head>

      <Header />

      <main className={styles.main}>
        <Toolbar
          onRun={handleRun}
          onFormat={handleFormat}
          onLoadExample={loadExample}
        />
        <div className={styles.playground}>
          <section className={styles.code}>
            <Editor
              height="100%"
              defaultLanguage="typescript"
              defaultValue=""
              value={sourceCode}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
            />
          </section>
          <section className={styles.console}>
            <h2>Console output:</h2>
            <p ref={sanitizeHelper} className={styles.sanitizer} />
            {/* eslint-disable-next-line react/no-danger */}
            <samp dangerouslySetInnerHTML={createSafeMarkup()} />
            {processing ? <Loading className={styles.loading} /> : null}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
