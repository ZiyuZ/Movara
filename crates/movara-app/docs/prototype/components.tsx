/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment, type Props } from './render';

export function Icon({ name }: Props) {
  const paths: Record<string, string> = {
    play: 'M6 3l10 7-10 7z', pause: 'M6 4v12M14 4v12', step: 'M4 4l8 6-8 6zM16 4v12',
    layers: 'M2 6l8-4 8 4-8 4zM2 10l8 4 8-4M2 14l8 4 8-4',
    pointer: 'M4 2l12 10-6 1-3 5z', sun: 'M10 1v2M10 17v2M1 10h2M17 10h2M4 4l1 1M15 15l1 1M4 16l1-1M15 5l1-1',
    history: 'M3 5a8 8 0 1 1-1 8M2 1v5h5M10 5v5l3 2',
    grid: 'M2 2h16v16H2zM2 10h16M10 2v16',
    route: 'M3 16V9a3 3 0 0 1 3-3h8M11 2l4 4-4 4',
    collapse: 'M4 7l6 6 6-6',
    close: 'M5 5l10 10M15 5L5 15',
  };
  return <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d={paths[String(name)] ?? paths.layers}/>{name === 'sun' && <circle cx="10" cy="10" r="4"/>}</svg>;
}
export function Button({ children, icon, ...props }: Props) {
  return <button type="button" {...props}>{icon && <Icon name={icon}/>} {children}</button>;
}
export function Header({ title, detail }: Props) {
  return <header class="panel-heading"><strong>{title}</strong><span class="muted">{detail}</span></header>;
}
export function TabBar({ label, tabs, detail }: Props) {
  const items = tabs as { key: string; label: string }[];
  return <header class="tab-heading"><div class="panel-tabs" role="tablist" aria-label={label}>{items.map((item, index) => <button type="button" id={`${item.key}-tab`} role="tab" aria-selected={String(index === 0)} aria-controls={`${item.key}-panel`} tabindex={index === 0 ? '0' : '-1'}>{item.label}</button>)}</div>{detail && <span class="muted tab-detail">{detail}</span>}</header>;
}
export function Field({ label, value, unit }: Props) {
  return <div class="property"><span class="muted">{label}</span><span>{value} <small>{unit}</small></span></div>;
}
