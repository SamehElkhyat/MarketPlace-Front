import { intlTag, type Locale } from "./config";
import type { en } from "./messages/en";

/** Structure of the English catalogue with every leaf widened to `string` — Arabic must match it exactly. */
export type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };
export type Messages = DeepStrings<typeof en>;

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Every translatable key, e.g. `"cart.empty.title"`. Typos are compile errors. */
export type MessageKey = Leaves<Messages>;
export type TranslateVars = Record<string, string | number>;
export type Translate = (key: MessageKey, vars?: TranslateVars) => string;

function matchingBrace(source: string, open: number): number {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return i;
  }
  return source.length - 1;
}

/** Parses `one {…} few {…} other {…}` / `=0 {…}` branches of an ICU plural. */
function parseBranches(body: string): Map<string, string> {
  const branches = new Map<string, string>();
  let i = 0;
  while (i < body.length) {
    const open = body.indexOf("{", i);
    if (open === -1) break;
    const selector = body.slice(i, open).trim();
    const close = matchingBrace(body, open);
    branches.set(selector, body.slice(open + 1, close));
    i = close + 1;
  }
  return branches;
}

function formatArgument(inner: string, vars: TranslateVars, locale: Locale): string {
  const comma = inner.indexOf(",");
  if (comma === -1) return String(vars[inner.trim()] ?? "");

  const name = inner.slice(0, comma).trim();
  const rest = inner.slice(comma + 1).trim();
  const typeEnd = rest.indexOf(",");
  const type = rest.slice(0, typeEnd).trim();
  if (type !== "plural") return String(vars[name] ?? "");

  const count = Number(vars[name] ?? 0);
  const branches = parseBranches(rest.slice(typeEnd + 1));
  const category = new Intl.PluralRules(intlTag(locale)).select(count);
  const chosen = branches.get(`=${count}`) ?? branches.get(category) ?? branches.get("other") ?? "";
  const formatted = new Intl.NumberFormat(intlTag(locale)).format(count);
  return formatMessage(chosen.replaceAll("#", formatted), vars, locale);
}

/** Minimal ICU: `{name}` interpolation and `{n, plural, one {…} other {…}}` with `#` for the number. */
export function formatMessage(message: string, vars: TranslateVars, locale: Locale): string {
  let out = "";
  let i = 0;
  while (i < message.length) {
    const char = message[i]!;
    if (char !== "{") {
      out += char;
      i++;
      continue;
    }
    const end = matchingBrace(message, i);
    out += formatArgument(message.slice(i + 1, end), vars, locale);
    i = end + 1;
  }
  return out;
}

function lookup(messages: Messages, key: string): string {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  return typeof node === "string" ? node : key;
}

export function createTranslator(messages: Messages, locale: Locale): Translate {
  return (key, vars) => {
    const message = lookup(messages, key);
    return vars || message.includes("{") ? formatMessage(message, vars ?? {}, locale) : message;
  };
}
