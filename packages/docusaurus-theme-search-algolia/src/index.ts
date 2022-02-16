/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path';
import fs from 'fs';
import {defaultConfig, compile} from 'eta';
import {normalizeUrl} from '@docusaurus/utils';
import {readDefaultCodeTranslationMessages} from '@docusaurus/theme-translations';
import logger from '@docusaurus/logger';
import openSearchTemplate from './templates/opensearch';
import {memoize} from 'lodash';

import type {LoadContext, Plugin} from '@docusaurus/types';
import type {ThemeConfig} from '@docusaurus/theme-search-algolia';

const getCompiledOpenSearchTemplate = memoize(() =>
  compile(openSearchTemplate.trim()),
);

function renderOpenSearchTemplate(data: {
  title: string;
  url: string;
  favicon: string | null;
}) {
  const compiled = getCompiledOpenSearchTemplate();
  return compiled(data, defaultConfig);
}

const OPEN_SEARCH_FILENAME = 'opensearch.xml';

export default function themeSearchAlgolia(context: LoadContext): Plugin<void> {
  const {
    baseUrl,
    siteConfig: {title, url, favicon, themeConfig},
    i18n: {currentLocale},
  } = context;
  const {
    algolia: {searchPage},
  } = themeConfig as ThemeConfig;
  const isSearchPageDisabled = searchPage === false;

  return {
    name: 'docusaurus-theme-search-algolia',

    getThemePath() {
      return path.resolve(__dirname, './theme');
    },

    getTypeScriptThemePath() {
      return path.resolve(__dirname, '..', 'src', 'theme');
    },

    getDefaultCodeTranslationMessages() {
      return readDefaultCodeTranslationMessages({
        locale: currentLocale,
        name: 'theme-search-algolia',
      });
    },

    async contentLoaded({actions: {addRoute}}) {
      if (isSearchPageDisabled) {
        return;
      }

      addRoute({
        path: normalizeUrl([baseUrl, searchPage as string]),
        component: '@theme/SearchPage',
        exact: true,
      });
    },

    async postBuild({outDir}) {
      if (isSearchPageDisabled) {
        return;
      }

      try {
        fs.writeFileSync(
          path.join(outDir, OPEN_SEARCH_FILENAME),
          renderOpenSearchTemplate({
            title,
            url: url + baseUrl,
            favicon: favicon ? normalizeUrl([url, baseUrl, favicon]) : null,
          }),
        );
      } catch (e) {
        logger.error('Generating OpenSearch file failed.');
        throw e;
      }
    },

    injectHtmlTags() {
      if (isSearchPageDisabled) {
        return {};
      }

      return {
        headTags: [
          {
            tagName: 'link',
            attributes: {
              rel: 'search',
              type: 'application/opensearchdescription+xml',
              title,
              href: normalizeUrl([baseUrl, OPEN_SEARCH_FILENAME]),
            },
          },
        ],
      };
    },
  };
}

export {validateThemeConfig} from './validateThemeConfig';
