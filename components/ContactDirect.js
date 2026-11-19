import Roll from "@/components/Roll";
import Reveal from "@/components/Reveal";
import { telHref } from "@/lib/footerContact";

export default function ContactDirect({ dict }) {
  const c = dict.contactPage.direct;

  return (
    <section className="[--u:1px] xl:[--u:clamp(0.667px,0.0520833vw,1px)] bg-brand-orange px-4 pb-20 pt-14 text-center text-white sm:px-6 md:pb-[6.9rem] md:pt-[5.125rem]">
      <div className="mx-auto max-w-[75rem] xl:max-w-[calc(1200*var(--u))]">
        <Reveal as="p" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] rtl:tracking-normal xl:text-[max(12px,calc(16*var(--u)))] xl:leading-[calc(24*var(--u))]">
          {c.eyebrow}
        </Reveal>
        <Reveal as="h2" delay={100} className="text-[26px] font-semibold leading-[1.25] tracking-[-0.015em] md:text-[32px] md:leading-[40px] xl:text-[max(28px,calc(40*var(--u)))] xl:leading-[calc(48*var(--u))]">
          {c.heading}
        </Reveal>
        <Reveal as="p" delay={200} className="mx-auto mt-4 max-w-[42rem] xl:mt-[calc(16*var(--u))] xl:max-w-[calc(820*var(--u))] text-[14px] leading-[22px] xl:text-[max(15px,calc(20*var(--u)))] xl:leading-[calc(30*var(--u))]">
          {c.text}
        </Reveal>
        <Reveal delay={320} className="mt-9 flex flex-col items-center justify-center gap-4 md:mt-12 md:flex-row md:gap-14 text-[14px] leading-[22px] xl:text-[max(15px,calc(20*var(--u)))] xl:leading-[calc(30*var(--u))]">
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span className="font-bold">{c.call}</span>
            {c.phone1 ? <a href={telHref(c.phone1)} dir="ltr" className="underline-offset-4 transition-opacity hover:opacity-90"><Roll>{c.phone1}</Roll></a> : null}
            {c.phone1 && c.phone2 ? <span className="hidden h-6 w-px bg-white md:block" aria-hidden="true" /> : null}
            {c.phone2 ? <a href={telHref(c.phone2)} dir="ltr" className="underline-offset-4 transition-opacity hover:opacity-90"><Roll>{c.phone2}</Roll></a> : null}
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-3">
            <span className="font-bold">{c.email}</span>
            {c.emailAddress ? <a href={`mailto:${c.emailAddress}`} className="underline-offset-4 transition-opacity hover:opacity-90"><Roll>{c.emailAddress}</Roll></a> : null}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
