"use client";

import { useState } from "react";

type CoverImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export function CoverImage(props: CoverImageProps) {
  if (!props.src) return null;
  return <CoverImageSource key={props.src} {...props} />;
}

function CoverImageSource({ src, alt, className }: CoverImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 封面允许管理员配置任意图片地址，尺寸交由使用方控制。
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
