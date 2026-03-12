import os
import csv
import json
import urllib.request
import urllib.error

# Adjust paths since script is now in website/scripts/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TSV_PATH = os.path.join(BASE_DIR, 'data', 'applets.tsv')
JSON_PATH = os.path.join(BASE_DIR, 'data', 'market-directory.json')

def fetch_github_stars(repo_url):
    """
    Given a GitHub URL like https://github.com/example/moonstone-kanban
    fetches the number of stars from the GitHub API.
    """
    if not repo_url.startswith('https://github.com/'):
        return 0
        
    parts = repo_url.rstrip('/').split('/')
    if len(parts) < 5:
        return 0
        
    owner = parts[-2]
    repo = parts[-1]
    
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    
    try:
        req = urllib.request.Request(api_url)
        # Using a dummy user-agent is sometimes required by GitHub API
        req.add_header('User-Agent', 'Moonstone-Market-Builder')
        # If running via GitHub Actions, we could add a GITHUB_TOKEN here to avoid rate limits
        if 'GITHUB_TOKEN' in os.environ:
            req.add_header('Authorization', f"token {os.environ['GITHUB_TOKEN']}")
            
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get('stargazers_count', 0)
    except urllib.error.URLError as e:
        print(f"Failed to fetch {repo_url}: {e}")
        return 0

def build_market():
    if not os.path.exists(TSV_PATH):
        print(f"Error: {TSV_PATH} not found.")
        return

    items = []
    
    # Read TSV
    with open(TSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            items.append(row)
            
    # Enrich with GitHub data
    print(f"Processing {len(items)} items...")
    for item in items:
        repo_url = item.get('url', '')
        print(f"Fetching stars for {repo_url}...")
        
        # We try to fetch real stars, but for our example dummy URLs, 
        # it will fail and return 0. If it returns 0 and there was a dummy 'stars' 
        # column in the TSV, we might want to keep the old dummy value for the preview,
        # but in production we'd overwrite it.
        # Let's keep the existing stars value if the API fails (useful for local testing with dummy data).
        real_stars = fetch_github_stars(repo_url)
        
        if real_stars > 0:
            item['stars'] = str(real_stars)
        else:
            # If API fails or it's a dummy repo, keep the existing 'stars' if it exists, else '0'
            item['stars'] = item.get('stars', '0')
            
    # Write JSON
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
        
    print(f"Success! Built {JSON_PATH}")

if __name__ == '__main__':
    build_market()