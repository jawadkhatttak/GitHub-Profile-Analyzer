document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('search-btn').addEventListener('click', () => {
        const username = document.getElementById('username-input').value.trim();
        if (!username) return;
        analyzeProfile(username);
    });

    document.getElementById('username-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const username = e.target.value.trim();
            if (!username) return;
            analyzeProfile(username);
        }
    });

});

async function getUser(username) {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
    return await response.json();
}

async function getAllRepos(username) {
    const allRepos = [];
    let page = 1;

    while (true) {
        const response = await fetch(
            `https://api.github.com/users/${username}/repos?per_page=100&page=${page}`
        );
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

        const repos = await response.json();
        if (repos.length === 0) break;

        allRepos.push(...repos);
        page++;
    }

    return allRepos;
}

async function getProfileAndRepos(username) {
    const [userData, repos] = await Promise.all([
        getUser(username),
        getAllRepos(username)
    ]);
    return { userData, repos };
}

function getLanguageStats(repos) {
    return repos
        .filter(repo => !repo.fork && repo.language !== null)
        .reduce((acc, repo) => {
            acc[repo.language] = (acc[repo.language] || 0) + 1;
            return acc;
        }, {});
}


async function analyzeProfile(username) {
    showError('');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('search-btn').textContent = 'Loading...';
    document.getElementById('search-btn').disabled = true;
    const cacheIndicator = document.getElementById('cache-indicator');

    try {
        
        let data = loadFromCache(username);

        if (data) {
            console.log(`Serving ${username} from cache`);
            cacheIndicator.classList.remove('hidden');
        } else {
            data = await getProfileAndRepos(username);
            saveToCache(username, data);
            cacheIndicator.classList.add('hidden');
        }

        const personality = getDeveloperPersonality(data.userData, data.repos);
        renderProfile(data.userData, personality);
        renderLanguageChart(data.repos);
        renderStarsChart(data.repos);



        document.getElementById('results').classList.remove('hidden');

    } catch (error) {
        showError(error.message);
    } finally {
        document.getElementById('search-btn').textContent = 'Analyze';
        document.getElementById('search-btn').disabled = false;
    }
}

function renderProfile(userData, personality) {
    document.getElementById('avatar').src = userData.avatar_url;
    document.getElementById('profile-name').textContent = userData.name || userData.login;
    document.getElementById('profile-bio').textContent = userData.bio || 'No bio provided';
    document.getElementById('stat-followers').textContent = formatNumber(userData.followers);
    document.getElementById('stat-repos').textContent = formatNumber(userData.public_repos);
    document.getElementById('stat-following').textContent = userData.following;
    document.getElementById('personality-result').textContent = personality;
}

// Language Pie Chart:
let langChartInstance = null; 

function renderLanguageChart(repos) {
    const languageMap = getLanguageStats(repos);
    const sorted = Object.entries(languageMap).sort((a, b) => b[1] - a[1]);

    const labels = sorted.map(([lang]) => lang);
    const values = sorted.map(([, count]) => count);

    const colors = [
        '#58a6ff', '#3fb950', '#f78166', '#d2a8ff',
        '#ffa657', '#79c0ff', '#56d364', '#ff7b72'
    ];

    
    if (langChartInstance) langChartInstance.destroy();

    const ctx = document.getElementById('lang-chart').getContext('2d');
    langChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#0d1117',
                borderWidth: 2
            }]
        },
        options: {
            plugins: {
                legend: { labels: { color: '#e6edf3' } }
            }
        }
    });
}


// Stars Bar Chart
let starsChartInstance = null;

function renderStarsChart(repos) {
    const top5 = [...repos]
        .filter(r => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 5);

    const labels = top5.map(r => r.name);
    const values = top5.map(r => r.stargazers_count);

    if (starsChartInstance) starsChartInstance.destroy();

    const ctx = document.getElementById('stars-chart').getContext('2d');
    starsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Stars',
                data: values,
                backgroundColor: '#238636',
                borderRadius: 6
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
                y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } }
            }
        }
    });
}

function showError(message) {
    const el = document.getElementById('error-msg');
    el.textContent = message;
    el.classList.toggle('hidden', !message);
}

// Developer Personality 
function getDeveloperPersonality(userData, repos) {
    const original = repos.filter(r => !r.fork);
    const totalStars = original.reduce((sum, r) => sum + r.stargazers_count, 0);
    const avgStars = original.length > 0 ? totalStars / original.length : 0;
    const languageMap = getLanguageStats(repos);
    const topLanguage = Object.entries(languageMap)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
    const forkRatio = repos.length > 0
        ? (repos.filter(r => r.fork).length / repos.length)
        : 0;

    // Rule-based personality engine
    if (avgStars > 5000) {
        return "🌟 Legendary Open Source Author";
    }
    if (userData.followers > 1000 && avgStars > 500) {
        return "🔥 Community Leader & Influencer";
    }
    if (original.length > 30 && avgStars < 50) {
        return "🛠️ Prolific Builder — Ships constantly, discovers in public";
    }
    if (forkRatio > 0.6) {
        return "📚 Active Learner — Studies others' code deeply";
    }
    if (topLanguage === 'Python') {
        return "🐍 Data & Automation Specialist";
    }
    if (topLanguage === 'TypeScript' || topLanguage === 'JavaScript') {
        return "🌐 Web Craftsman — Lives in the browser";
    }
    if (topLanguage === 'Rust' || topLanguage === 'Go' || topLanguage === 'C' || topLanguage === 'C++') {
        return "⚙️ Systems Engineer — Thinks in memory and performance";
    }
    if (userData.public_repos < 5) {
        return "🌱 Early Stage — Just getting started";
    }
    return "💻 Full-Stack Explorer — Comfortable across the whole system";
}


// LOCAL STORAGE CACHING 
const CACHE_DURATION_MS = 30 * 60 * 1000; 

function saveToCache(username, data) {
    const entry = {
        timestamp: Date.now(),
        data: data
    };
    localStorage.setItem(`gh_cache_${username}`, JSON.stringify(entry));
}

function loadFromCache(username) {
    const raw = localStorage.getItem(`gh_cache_${username}`);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    const age = Date.now() - entry.timestamp;

    if (age > CACHE_DURATION_MS) {
        localStorage.removeItem(`gh_cache_${username}`); 
        return null;
    }

    return entry.data;
}

function formatNumber(num) {
    return num.toLocaleString();
}
