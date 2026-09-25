import { VERSION_SPRITE, type NomIcone } from "./icones";

type Props = { nom: NomIcone; className?: string; titre?: string };

export function Icone({ nom, className = "size-6", titre }: Props) {
  return (
    <svg
      className={className}
      aria-hidden={titre ? undefined : true}
      role={titre ? "img" : undefined}
      aria-label={titre}
      focusable="false"
    >
      <use href={`/icons/sprite.svg?v=${VERSION_SPRITE}#${nom}`} />
    </svg>
  );
}
