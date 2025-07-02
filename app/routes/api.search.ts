import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('api.search');

interface SearchResultItem {
  title: string;
  link: string;
  snippet: string;
}

// Basic HTML parser - very naive, might need a library for robustness
// This is a simplified parser focusing on DuckDuckGo's HTML output structure.
function parseDuckDuckGoHTML(html: string): SearchResultItem[] {
  const results: SearchResultItem[] = [];
  // Regex to find result blocks. This is highly dependent on DDG's HTML structure and might break.
  // It looks for <div class="result"> or similar common DDG result containers.
  // A more robust solution would use an HTML parsing library.
  const resultBlockRegex = /<div class="web-result">([\s\S]*?)<\/div>/g;
  let match;

  // Limit the number of results to parse to avoid overly complex regex or performance issues
  const maxResults = 5;
  let count = 0;

  while ((match = resultBlockRegex.exec(html)) !== null && count < maxResults) {
    const block = match[1];

    const titleRegex = /<a class="result__a".*?href="([^"]*)".*?>([\s\S]*?)<\/a>/;
    const snippetRegex = /<a class="result__snippet".*?>([\s\S]*?)<\/a>/; // Snippet is also a link

    const titleMatch = block.match(titleRegex);
    const snippetMatch = block.match(snippetRegex);

    if (titleMatch && titleMatch[1] && titleMatch[2]) {
      const rawLink = titleMatch[1];
      // Links from DDG HTML results are often prefixed with //duckduckgo.com/l/?uddg=...
      // We need to extract the actual target URL.
      let actualLink = rawLink;
      if (rawLink.includes('duckduckgo.com/l/')) {
        try {
          const urlParams = new URLSearchParams(rawLink.substring(rawLink.indexOf('?')));
          const uddgLink = urlParams.get('uddg');
          if (uddgLink) {
            actualLink = decodeURIComponent(uddgLink);
          }
        } catch (e) {
          logger.warn('Failed to parse DDG redirect link:', rawLink, e);
        }
      }

      // Clean up title (remove HTML tags)
      const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();
      const snippet = snippetMatch && snippetMatch[1] ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : 'No snippet available.';

      if (title && actualLink) {
        results.push({
          title,
          link: actualLink,
          snippet,
        });
        count++;
      }
    }
  }
  return results;
}


export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  logger.info(`Fetching search results for query: "${query}"`);

  try {
    // Using html.duckduckgo.com to avoid JavaScript and simplify parsing
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        // DDG might block requests without a common user agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      logger.error(`DuckDuckGo request failed with status: ${response.status} ${response.statusText}`);
      return json({ error: 'Failed to fetch search results from DuckDuckGo', details: response.statusText }, { status: response.status });
    }

    const html = await response.text();
    const searchResults = parseDuckDuckGoHTML(html);

    logger.info(`Found ${searchResults.length} results for query: "${query}"`);
    return json(searchResults);

  } catch (error: any) {
    logger.error('Error fetching or parsing search results:', error);
    return json({ error: 'Failed to fetch search results', details: error.message }, { status: 500 });
  }
}

// Action function can be used if we want to POST to this endpoint,
// but for search, GET (loader) is more conventional.
// export async function action({ request }: ActionFunctionArgs) {
//   // ...
// }
