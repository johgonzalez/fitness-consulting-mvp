import Image from "next/image";

export function PperfilAnimatedWordmark({ id }: { id: string }) {
  return <h1 id={id} className="pperfil-wordmark" aria-label="PPerfil">
    <span className="pperfil-wordmark__reveal" aria-hidden="true">
      <span className="pperfil-wordmark__breath">
        <Image
          className="pperfil-wordmark__image"
          src="/auth/brand/pperfil-wordmark-static.png"
          alt=""
          width={2236}
          height={380}
          sizes="(max-width: 390px) 60vw, 232px"
          priority
          unoptimized
        />
        <span className="pperfil-wordmark__sheen" aria-hidden="true" />
      </span>
    </span>
  </h1>;
}
