import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eden Rebello - SWE" },
      {
        name: "description",
        content:
          "Eden's cave. Design, engineering, and things currently shipping.",
      },
      { property: "og:title", content: "Eden Rebello" },
      {
        property: "og:description",
        content: "Eden's personal website. Design, engineering, and recent work.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);

  // Cursor + spotlight
  useEffect(() => {
    let rafId = 0;
    let tx = 0, ty = 0, rx = 0, ry = 0;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${tx}px, ${ty}px) translate(-50%,-50%)`;
      }
      if (spotRef.current) {
        spotRef.current.style.setProperty("--x", `${tx}px`);
        spotRef.current.style.setProperty("--y", `${ty}px`);
      }
    };

    const tick = () => {
      rx += (tx - rx) * 0.18;
      ry += (ty - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("a, button, [data-hover]")) {
        document.body.classList.add("cursor-hover");
      }
    };
    const onOut = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.closest("a, button, [data-hover]")) {
        document.body.classList.remove("cursor-hover");
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Scroll reveal + progress bar
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));

    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      if (barRef.current) barRef.current.style.setProperty("--p", String(p));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Persistent pen-like ink trail on a full-page canvas
  useEffect(() => {
    const canvas = inkRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = window.innerWidth;
      const h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      // Preserve existing ink when resizing by copying pixels
      const prev = document.createElement("canvas");
      prev.width = canvas.width;
      prev.height = canvas.height;
      const pctx = prev.getContext("2d");
      if (pctx && canvas.width > 0) pctx.drawImage(canvas, 0, 0);

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(prev, 0, 0, prev.width / dpr, prev.height / dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };
    resize();

    let last: { x: number; y: number; t: number } | null = null;

    const draw = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY + window.scrollY;
      const now = performance.now();
      if (!last) {
        last = { x, y, t: now };
        return;
      }
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      const dt = Math.max(1, now - last.t);
      const speed = dist / dt; // px per ms
      // Pen: slower = thicker, faster = thinner
      const width = Math.max(0.8, Math.min(3.2, 3.6 - speed * 2.0));
      ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      last = { x, y, t: now };
    };

    let rafPending = false;
    const onMove = (e: MouseEvent) => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(() => {
        draw(e);
        rafPending = false;
      });
    };
    const onLeave = () => { last = null; };

    let resizeT: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(resize, 150);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize);
    // Also grow the canvas as content grows
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      <canvas ref={inkRef} className="ink-canvas" aria-hidden />
      <div ref={spotRef} className="spotlight" aria-hidden />
      <div className="grain" aria-hidden />
      <div ref={barRef} className="scroll-bar" aria-hidden />
      <div ref={ringRef} className="cursor-ring" aria-hidden />
      <div ref={dotRef} className="cursor-dot" aria-hidden />

      <main className="relative mx-auto px-6 py-16 md:py-24 prose-md" style={{ zIndex: 2 }}>
        <p className="kicker reveal"><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse align-middle mr-2 -mt-0.5" />Currently working on</p>

        <h1 className="reveal"><a href="https://github.com/edenreb/lesion-classifiers">Skin Lesion Classifers</a></h1>
        <h2 className="reveal">Working on things I care about.</h2>

        <p className="reveal">
          I&apos;m a Computer Science student at the{" "}
          <a className="sweep" href="#">University of Illinois Urbana-Champaign</a>. I write software, ship interfaces, and occasionally
          publish notes on how it&apos;s going. Right now I&apos;m focused on{" "}
          <a className="sweep" href="#">one specific problem</a> — everything else is secondary.
        </p>

        <p className="reveal">
          I started in engineering and moved sideways into design. I still enjoy
          writing the code and deploying to production. Combining both lets me
          build things that are opinionated, small, and ready to ship.
        </p>

        <h2 className="reveal">Recent ships</h2>

        <ul>
          <li className="reveal">
            <a className="sweep" href="#">Project one</a> — a short line about what it does and why it
            mattered.
          </li>
          <li className="reveal">
            <a className="sweep" href="#">Project two</a> — another small tool, shipped in a weekend.
          </li>
          <li className="reveal">
            <a className="sweep" href="#">Project three</a> — an essay, a talk, or a side experiment.
          </li>
        </ul>

        <h2 className="reveal">Writing</h2>

        <ul>
          <li className="reveal">
            <a className="sweep" href="#">On shipping less</a>{" "}
            <span className="text-muted-foreground">— 2026</span>
          </li>
          <li className="reveal">
            <a className="sweep" href="#">Notes from a year of building alone</a>{" "}
            <span className="text-muted-foreground">— 2025</span>
          </li>
          <li className="reveal">
            <a className="sweep" href="#">Why I stopped using frameworks</a>{" "}
            <span className="text-muted-foreground">— 2025</span>
          </li>
        </ul>

        <h2 className="reveal">Experience</h2>

        <ul>
          <li className="reveal">
            <strong>Independent</strong> — Designer & Engineer{" "}
            <span className="text-muted-foreground">· 2023 – Present</span>
            <br />
            Shipping small products end-to-end. Design, build, deploy, repeat.
          </li>
          <li className="reveal">
            <strong>Company Two</strong> — Senior Product Engineer{" "}
            <span className="text-muted-foreground">· 2020 – 2023</span>
            <br />
            Led the redesign of the core product. Grew the design system from zero.
          </li>
          <li className="reveal">
            <strong>Company One</strong> — Frontend Engineer{" "}
            <span className="text-muted-foreground">· 2018 – 2020</span>
            <br />
            First engineering hire. Built the initial web app and public API.
          </li>
        </ul>

        <h2 className="reveal">Education</h2>

        <ul>
          <li className="reveal">
            <strong>Your University</strong> — B.Sc. Computer Science{" "}
            <span className="text-muted-foreground">· 2014 – 2018</span>
          </li>
          <li className="reveal">
            <strong>Some Program</strong> — Design intensive{" "}
            <span className="text-muted-foreground">· 2019</span>
          </li>
        </ul>

        <h2 className="reveal">Stuff I like</h2>

        <ul>
          <li className="reveal">Long walks, longer edits.</li>
          <li className="reveal">Typography, keyboards, cold coffee.</li>
          <li className="reveal">Books about buildings and the people who make them.</li>
        </ul>

        <h2 className="reveal">Elsewhere</h2>

        <p className="reveal">
          <a className="sweep" href="#">GitHub</a> · <a className="sweep" href="#">Twitter</a> ·{" "}
          <a className="sweep" href="#">LinkedIn</a> ·{" "}
          <a className="sweep" href="mailto:you@example.com">Email</a>
        </p>

        <hr />

        <p className="text-sm text-muted-foreground reveal">
          Last updated {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
          Built with intention, not much else.{" "}
          <Link to="/" className="sweep">Home</Link>.
        </p>
      </main>
    </>
  );
}
