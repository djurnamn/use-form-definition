import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfiguration: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfiguration);
