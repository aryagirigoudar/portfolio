import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  asset,
  datasetSchema,
  loadData,
  profileSchema,
  type Dataset,
  type Profile,
  type Project,
} from "./data";
import "./style.css";

type Reaction = "shy" | "party" | "whatever";
const reactions: Record<
  Reaction,
  { file: string; still: string; title: string; copy: string; alt: string }
> = {
  shy: {
    file: "shy.gif",
    still: "shy.png",
    title: "Stop it. My notice period is blushing.",
    copy: "Excellent judgement, honestly. Let’s make this mildly awkward introduction official.",
    alt: "Modi smiling shyly",
  },
  party: {
    file: "party.gif",
    still: "party.png",
    title: "A small celebration. Very restrained.",
    copy: "You made it through my projects. That’s basically a second-round interview.",
    alt: "Modi clapping in a celebratory reaction",
  },
  whatever: {
    file: "whatever.gif",
    still: "whatever.png",
    title: "Your loss. Allegedly.",
    copy: "I’ll be here, dramatically pretending I didn’t care. You can still email me.",
    alt: "Trump making a dismissive reaction",
  },
};
const email = "arya.girigoudar@gmail.com";

function ReactionDialog({
  kind,
  close,
}: {
  kind: Reaction;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [animate, setAnimate] = useState(
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const reaction = reactions[kind];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="reaction"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      aria-labelledby="reaction-title"
    >
      <button
        className="dialog-close"
        onClick={close}
        aria-label="Close reaction"
      >
        ×
      </button>
      <span className="eyebrow">AN ENTIRELY PROFESSIONAL RESPONSE</span>
      <img
        src={asset(`media/${animate ? reaction.file : reaction.still}`)}
        alt={reaction.alt}
        width="360"
        height="300"
      />
      <button className="motion-control" onClick={() => setAnimate(!animate)}>
        {animate ? "Pause animation" : "Play animation"}
      </button>
      <h2 id="reaction-title">{reaction.title}</h2>
      <p>{reaction.copy}</p>
      <a
        className="button dark"
        href={`mailto:${email}?subject=Let%E2%80%99s%20talk%2C%20Arya`}
      >
        Let’s talk ↗
      </a>
    </dialog>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const [brokenIcon, setBrokenIcon] = useState(false);
  return (
    <article className={`project-card card-${index % 3}`}>
      <div className="project-art" aria-hidden="true">
        <span className="project-number">
          EXHIBIT {String(index + 1).padStart(2, "0")}
        </span>
        {project.icon_url && !brokenIcon ? (
          <img
            src={asset(project.icon_url)}
            onError={() => setBrokenIcon(true)}
            alt=""
            loading="lazy"
          />
        ) : (
          <span className="project-monogram">
            {project.title
              .split(" ")
              .slice(0, 2)
              .map((word) => word[0])
              .join("")}
            <i>↗</i>
          </span>
        )}
        <span className="status">
          <i />
          {project.status.replaceAll("_", " ")}
        </span>
      </div>
      <div className="project-body">
        <div className="project-category">
          {project.category}
          {project.featured && <span>★ Selected</span>}
        </div>
        <h3>{project.title}</h3>
        <p className="tagline">{project.tagline}</p>
        <details>
          <summary>
            The slightly longer story <span>+</span>
          </summary>
          <p>{project.description}</p>
          <p className="updated">
            Updated {new Date(project.updated_at).toLocaleDateString("en-GB")}
          </p>
        </details>
        <div className="tags">
          {project.technologies.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>
        <div className="project-links">
          {project.demo_url && (
            <a href={project.demo_url} target="_blank" rel="noreferrer">
              See it in action ↗
            </a>
          )}
          {project.source_url ? (
            <a href={project.source_url} target="_blank" rel="noreferrer">
              Source ↗
            </a>
          ) : (
            <span>Source stays backstage.</span>
          )}
        </div>
      </div>
    </article>
  );
}

function Projects({ celebrate }: { celebrate: () => void }) {
  const [data, setData] = useState<Dataset>();
  const [failed, setFailed] = useState(false);
  const [stale, setStale] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [technology, setTechnology] = useState("All");
  useEffect(() => {
    loadData("data/projects.json", datasetSchema)
      .then((result) => {
        setData(result.data);
        setStale(result.stale);
      })
      .catch(() => setFailed(true));
  }, []);
  const projects = data?.projects ?? [];
  const visible = projects.filter(
    (project) =>
      (category === "All" || project.category === category) &&
      (technology === "All" || project.technologies.includes(technology)) &&
      `${project.title} ${project.tagline} ${project.description} ${project.technologies.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section
      className="section wrap"
      id="projects"
      aria-labelledby="projects-title"
    >
      <div className="section-top">
        <span className="eyebrow">02 / THE EVIDENCE</span>
        <span className="margin-note">Less talking. More receipts.</span>
      </div>
      <div className="section-heading">
        <h2 id="projects-title">
          Things I actually
          <br />
          <em>followed through on.</em>
        </h2>
        <p>
          A few projects that escaped the
          <br />
          “I have an idea” phase.
        </p>
      </div>
      <div className="filters">
        <label className="search">
          <span>⌕</span>
          <input
            type="search"
            aria-label="Search projects"
            placeholder="Find something interesting…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select
            aria-label="Category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="All">Every category</option>
            {[...new Set(projects.map((p) => p.category))]
              .sort()
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Technology</span>
          <select
            aria-label="Technology"
            value={technology}
            onChange={(event) => setTechnology(event.target.value)}
          >
            <option value="All">Every tool</option>
            {[...new Set(projects.flatMap((p) => p.technologies))]
              .sort()
              .map((value) => (
                <option key={value}>{value}</option>
              ))}
          </select>
        </label>
      </div>
      <div aria-live="polite" className="data-note">
        {data?.preview &&
          "A local preview from my existing portfolio. Live updates are coming."}
        {stale &&
          ` Showing the last saved collection, published ${new Date(data!.generated_at).toLocaleDateString()}.`}
      </div>
      {!data && !failed && (
        <p role="status" className="empty">
          Gathering the evidence…
        </p>
      )}
      {failed && (
        <p role="alert" className="empty">
          The projects have chosen mystery today. Please reload, or{" "}
          <a href={`mailto:${email}`}>ask me directly</a>.
        </p>
      )}
      {data && visible.length === 0 && (
        <div className="empty">
          <p>
            {projects.length
              ? "No matches. Even my projects have boundaries."
              : "Nothing public yet. The plot is still developing."}
          </p>
          {projects.length > 0 && (
            <button
              onClick={() => {
                setSearch("");
                setCategory("All");
                setTechnology("All");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      <div className="project-grid">
        {visible.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} />
        ))}
      </div>
      {visible.length > 0 && (
        <div className="project-end">
          <p>Yes, there was debugging. No, we don’t talk about it.</p>
          <button className="text-button" onClick={celebrate}>
            Respectable work, honestly. ↗
          </button>
        </div>
      )}
    </section>
  );
}

function App() {
  const [profile, setProfile] = useState<Profile>();
  const [profileFailed, setProfileFailed] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    loadData("data/profile.json", profileSchema)
      .then((result) => setProfile(result.data))
      .catch(() => setProfileFailed(true));
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="navigation wrap">
        <a className="brand" href="#" aria-label="Arya, home">
          arya<span>.</span>
        </a>
        <button
          className="menu-toggle"
          aria-controls="navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
        <nav
          id="navigation"
          className={menuOpen ? "open" : ""}
          aria-label="Main navigation"
        >
          {[
            ["About", "about"],
            ["The work", "projects"],
            ["The plot", "experience"],
          ].map(([label, id]) => (
            <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
              {label}
            </a>
          ))}
          <a
            href="#contact"
            className="nav-contact"
            onClick={() => setMenuOpen(false)}
          >
            Say hello <span>↗</span>
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-top">
            <span className="eyebrow">
              <i className="live-dot" /> SOFTWARE ENGINEER. ACTUAL HUMAN.
            </span>
            <span className="location">Bengaluru, India ↗</span>
          </div>
          <div className="hero-layout">
            <div className="hero-copy">
              <p className="hello">Oh, hey. I’m</p>
              <h1 id="hero-title">
                Arya
                <br />
                Girigoudar<span className="period">.</span>
              </h1>
              <p className="hero-aside">
                I build things.
                <br />
                <span>
                  And have a perfectly reasonable
                  <br />
                  number of opinions about them.
                </span>
              </p>
              <div className="hero-actions">
                <a className="button dark" href="#projects">
                  Judge my work <span>↘</span>
                </a>
                <button
                  className="button outline"
                  onClick={() => setReaction("shy")}
                >
                  I’d hire you <span>↗</span>
                </button>
              </div>
              {profile?.resume_url && (
                <a
                  className="hero-resume"
                  href={asset(profile.resume_url)}
                  download
                >
                  {profile.resume_draft
                    ? "Download resume draft"
                    : "Download resume"}{" "}
                  ↓ <span>The suspiciously normal PDF.</span>
                </a>
              )}
            </div>
            <div className="portrait-area">
              <div className="portrait-frame">
                <img
                  className="portrait"
                  src={asset("media/arya.webp")}
                  width="675"
                  height="1200"
                  fetchPriority="high"
                  alt="Arya outdoors, wearing sunglasses"
                />
                <span className="photo-label">
                  FIG. 01 — ME, OUTSIDE FOR ONCE.
                </span>
              </div>
              <span className="portrait-sticker">
                Not an AI.
                <br />
                <em>Mostly.</em>
                <span>✳</span>
              </span>
              <span className="portrait-note">
                the face behind
                <br />
                the excessive tabs ⤴
              </span>
            </div>
          </div>
          <div className="hero-bottom">
            <span>GOOD SOFTWARE. QUESTIONABLE JOKES.</span>
            <a href="#about">There’s more. Unfortunately. ↓</a>
          </div>
        </section>
        <section className="about section wrap" id="about">
          <div className="section-top">
            <span className="eyebrow">
              01 / THE PERSON ATTACHED TO THE PHOTO
            </span>
            <span className="margin-note">
              A brief attempt at being serious.
            </span>
          </div>
          <div className="about-grid">
            <h2>
              Serious about
              <br />
              the work.
              <br />
              <em>Not myself.</em>
            </h2>
            <div className="about-copy">
              <p className="lead">
                {profile?.summary ??
                  "I’m Arya, a software engineer in Bengaluru. I like making complicated things easier to use. Ideally without making them someone else’s problem."}
              </p>
              <p>
                I enjoy the part where a messy idea becomes something useful.
                Building it, questioning it, making it better. Also, apparently,
                making a website about myself. We all have our moments.
              </p>
              <span className="hand-note">
                Less “visionary thought leader”. More “let me fix that”.
              </span>
            </div>
          </div>
        </section>
        <div className="marquee" aria-hidden="true">
          <span>BUILDS THINGS</span>
          <i>✳</i>
          <span>ASKS WHY</span>
          <i>✳</i>
          <span>GOOGLES STUFF</span>
          <i>✳</i>
          <span>REPEATS</span>
          <i>✳</i>
        </div>
        <Projects celebrate={() => setReaction("party")} />
        <section id="experience" className="experience-section">
          <div className="wrap section">
            <div className="section-top">
              <span className="eyebrow">03 / THE PLOT SO FAR</span>
              <span className="margin-note">
                People have paid me to do this.
              </span>
            </div>
            <div className="experience-layout">
              <div>
                <h2>
                  A little
                  <br />
                  <em>work history.</em>
                </h2>
                <p>
                  No origin story.
                  <br />
                  Just the relevant chapters.
                </p>
                {profile?.resume_url && (
                  <a
                    className="button lime"
                    href={asset(profile.resume_url)}
                    download
                  >
                    {profile.resume_draft
                      ? "Download resume draft"
                      : "Download resume"}{" "}
                    <span>↓</span>
                  </a>
                )}
              </div>
              <div className="timeline">
                {profile?.experience.map((item, i) => (
                  <article key={`${item.company}-${item.role}`}>
                    <span className="timeline-number">0{i + 1}</span>
                    <div>
                      <span className="timeline-period">{item.period}</span>
                      <h3>{item.role}</h3>
                      <p className="company">{item.company}</p>
                      {item.highlights.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </article>
                ))}
                {profileFailed && (
                  <p>
                    Work history couldn’t load.{" "}
                    <a href={`mailto:${email}`}>Ask me for a copy.</a>
                  </p>
                )}
                {!profile && !profileFailed && (
                  <p role="status">Loading the relevant chapters…</p>
                )}
                {profile && !profile.experience.length && (
                  <p>The next chapter is being written.</p>
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="section skills wrap" id="skills">
          <div className="section-top">
            <span className="eyebrow">04 / SOME TOOLS I KNOW</span>
            <span className="margin-note">A personality? In this economy?</span>
          </div>
          <div className="skills-layout">
            <h2>
              Whatever gets
              <br />
              <em>the job done.</em>
            </h2>
            <div className="skill-groups">
              {profile &&
                Object.entries(profile.skills).map(([group, skills]) => (
                  <div key={group}>
                    <h3>{group}</h3>
                    <div className="tags">
                      {skills.map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
        <section id="contact" className="contact">
          <div className="wrap section">
            <div className="section-top">
              <span className="eyebrow">05 / YOUR MOVE</span>
              <span className="margin-note">
                You’ve scrolled this far. We’re basically friends.
              </span>
            </div>
            <div className="contact-layout">
              <div>
                <span className="contact-label">
                  GOT A PROJECT? AN OPPORTUNITY? A REALLY GOOD MEME?
                </span>
                <h2>
                  Let’s make
                  <br />
                  <em>something happen.</em>
                </h2>
                <a
                  className="contact-email"
                  href={`mailto:${profile?.email ?? email}`}
                >
                  {profile?.email ?? email} ↗
                </a>
                <div className="social-links">
                  {profile?.github && (
                    <a href={profile.github} target="_blank" rel="noreferrer">
                      GitHub ↗
                    </a>
                  )}
                  {profile?.linkedin && (
                    <a href={profile.linkedin} target="_blank" rel="noreferrer">
                      LinkedIn ↗
                    </a>
                  )}
                  <a href={`mailto:${profile?.email ?? email}`}>
                    The old-fashioned email ↗
                  </a>
                </div>
              </div>
              <div className="verdict">
                <span className="eyebrow">SO, WHAT’S THE VERDICT?</span>
                <button
                  className="button dark"
                  onClick={() => setReaction("shy")}
                >
                  You’re a good fit <span>↗</span>
                </button>
                <button
                  className="text-button"
                  onClick={() => setReaction("whatever")}
                >
                  I’m just browsing.
                </button>
                <p>
                  Both are valid.
                  <br />
                  One hurts my feelings slightly.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="wrap">
        <a className="brand" href="#">
          arya<span>.</span>
        </a>
        <span>
          © {new Date().getFullYear()} Arya Girigoudar. Made with intent. And
          snacks.
        </span>
        <a href="#">Back to the ego section ↑</a>
      </footer>
      {reaction && (
        <ReactionDialog kind={reaction} close={() => setReaction(null)} />
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
