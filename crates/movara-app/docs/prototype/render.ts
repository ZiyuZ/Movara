/** A small, build-time JSX serializer for trusted prototype components. */
export type Child = string | number | boolean | null | undefined | Element | Child[];
export type Props = Record<string, unknown> & { children?: Child[] };
type Component = (props: Props) => Child;
export interface Element {
  tag: string;
  props: Props;
  children: Child[];
}

export function h(tag: string | Component, props: Props | null, ...children: Child[]): Child {
  if (typeof tag === 'function') return tag({ ...props, children });
  return { tag, props: props ?? {}, children };
}

export function Fragment({ children }: Props): Child { return children; }

const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function render(node: Child): string {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(render).join('');
  if (typeof node === 'string' || typeof node === 'number') return escape(String(node));
  if (typeof node.tag !== 'string' || !/^[a-z][a-z0-9-]*$/i.test(node.tag)) throw new Error(`Invalid JSX node or tag: ${node.tag}`);
  const attributes = Object.entries(node.props).map(([name, value]) => {
    if (name === 'children' || value == null || value === false) return '';
    if (!/^[a-z_:][a-z0-9_:.-]*$/i.test(name) || /^on/i.test(name)) throw new Error(`Invalid attribute: ${name}`);
    if (typeof value !== 'string' && typeof value !== 'number' && value !== true) throw new Error(`Unsupported attribute value: ${name}`);
    return ` ${name === 'className' ? 'class' : name}="${escape(value === true ? '' : String(value))}"`;
  }).join('');
  if (voidTags.has(node.tag)) {
    if (node.children.length) throw new Error(`Void element has children: ${node.tag}`);
    return `<${node.tag}${attributes}>`;
  }
  return `<${node.tag}${attributes}>${render(node.children)}</${node.tag}>`;
}

declare global {
  namespace JSX {
    type Element = Child;
    interface IntrinsicElements { [tag: string]: Props }
  }
}
