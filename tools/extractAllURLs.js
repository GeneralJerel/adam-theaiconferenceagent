const puppeteer = require('puppeteer');
const fs = require('fs');

async function getYouTubePlaylistVideos(playlistUrl, daysThreshold = 3) {
    const browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Set a user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Navigate to the playlist page
        console.log(`Navigating to playlist: ${playlistUrl}`);
        await page.goto(playlistUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        
        // Wait for the playlist to load
        await page.waitForSelector('ytd-playlist-video-renderer, ytd-playlist-video-list-renderer', { timeout: 15000 });
        
        // Scroll down to load more videos if needed
        await autoScroll(page);
        
        // Extract video information
        const videos = await page.evaluate(() => {
            const videoElements = document.querySelectorAll('ytd-playlist-video-renderer');
            const videoData = [];
            
            videoElements.forEach((element, index) => {
                try {
                    // Get video link - try multiple selectors
                    const linkElement = element.querySelector('a#video-title') || 
                                      element.querySelector('h3 a') || 
                                      element.querySelector('a[href*="/watch"]');
                    
                    if (!linkElement) return;
                    
                    const href = linkElement.href;
                    const title = linkElement.textContent.trim();
                    
                    // Get channel name
                    const channelElement = element.querySelector('#channel-name a') || 
                                         element.querySelector('ytd-channel-name a');
                    const channelName = channelElement ? channelElement.textContent.trim() : '';
                    
                    // Get video duration
                    const durationElement = element.querySelector('#time-status span') ||
                                          element.querySelector('.ytd-thumbnail-overlay-time-status-renderer');
                    const duration = durationElement ? durationElement.textContent.trim() : '';
                    
                    // Get video index in playlist
                    const indexElement = element.querySelector('#index');
                    const playlistIndex = indexElement ? indexElement.textContent.trim() : (index + 1).toString();
                    
                    if (href && title) {
                        videoData.push({
                            title: title,
                            url: href,
                            channelName: channelName,
                            duration: duration,
                            playlistIndex: playlistIndex,
                            uploadTimeText: 'N/A' // Playlists don't always show upload dates
                        });
                    }
                } catch (error) {
                    console.warn(`Error processing video element ${index}:`, error.message);
                }
            });
            
            return videoData;
        });
        
        // For playlists, we typically want all videos, not just recent ones
        // But we can still filter if upload time is available
        const filteredVideos = daysThreshold > 0 ? 
            videos.filter(video => video.uploadTimeText === 'N/A' || isWithinDays(video.uploadTimeText, daysThreshold)) :
            videos;
        
        // Log results
        console.log(`\nFound ${filteredVideos.length} videos in the playlist:\n`);
        filteredVideos.forEach((video, index) => {
            console.log(`${video.playlistIndex}. ${video.title}`);
            console.log(`   URL: ${video.url}`);
            console.log(`   Channel: ${video.channelName}`);
            console.log(`   Duration: ${video.duration}`);
            console.log(`   Upload: ${video.uploadTimeText}\n`);
        });
        
        await browser.close();
        return filteredVideos;
        
    } catch (error) {
        console.error('Error scraping YouTube playlist:', error);
        await browser.close();
        throw error;
    }
}

// Scrape a channel's Videos tab, e.g. https://www.youtube.com/@aiconference/videos
async function getYouTubeChannelVideos(channelVideosUrl, daysThreshold = 3) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`Navigating to channel videos: ${channelVideosUrl}`);
        await page.goto(channelVideosUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Ensure we are on the videos tab (some channel URLs redirect to /featured)
        if (!/\/videos(\?|$)/.test(page.url())) {
            const videosHref = await page.evaluate(() => {
                const anchor = Array.from(document.querySelectorAll('a'))
                    .find(a => a.getAttribute('href') && /\/videos$/.test(a.getAttribute('href')));
                return anchor ? anchor.href : null;
            });
            if (videosHref) {
                await page.goto(videosHref, { waitUntil: 'networkidle2', timeout: 30000 });
            }
        }

        // Wait for any of the known video item renderers
        await page.waitForSelector('ytd-rich-grid-media, ytd-grid-video-renderer', { timeout: 20000 });

        // Scroll to load more videos
        await autoScroll(page);

        const videos = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('ytd-rich-grid-media, ytd-grid-video-renderer'));
            const channelNameMeta = document.querySelector('meta[itemprop="name"][content]');
            const channelNameHeader = document.querySelector('yt-formatted-string.ytd-channel-name a');
            const channelName = (channelNameMeta && channelNameMeta.getAttribute('content'))
                || (channelNameHeader && channelNameHeader.textContent && channelNameHeader.textContent.trim())
                || '';

            return items.map((el, index) => {
                const link = el.querySelector('a#video-title') || el.querySelector('a[href*="/watch"]');
                const href = link ? link.href : '';
                const title = link && link.textContent ? link.textContent.trim() : '';

                const durationEl = el.querySelector('.ytd-thumbnail-overlay-time-status-renderer') || el.querySelector('#time-status span');
                const duration = durationEl ? durationEl.textContent.trim() : '';

                // Upload time typically found in metadata line spans
                let uploadTimeText = '';
                const metaSpans = el.querySelectorAll('#metadata-line span');
                if (metaSpans && metaSpans.length) {
                    const texts = Array.from(metaSpans).map(s => s.textContent ? s.textContent.trim() : '');
                    uploadTimeText = texts.find(t => /ago|Streamed|Premiered/i.test(t)) || texts[1] || texts[0] || '';
                }

                return {
                    title,
                    url: href,
                    channelName,
                    duration,
                    uploadTimeText,
                    playlistIndex: (index + 1).toString(),
                };
            });
        });

        const filteredVideos = daysThreshold > 0 ? videos.filter(v => isWithinDays(v.uploadTimeText, daysThreshold)) : videos;

        console.log(`\nFound ${filteredVideos.length} videos on the channel page:\n`);
        filteredVideos.forEach((video, i) => {
            console.log(`${i + 1}. ${video.title}`);
            console.log(`   URL: ${video.url}`);
            console.log(`   Channel: ${video.channelName}`);
            console.log(`   Duration: ${video.duration}`);
            console.log(`   Upload: ${video.uploadTimeText}\n`);
        });

        await browser.close();
        return filteredVideos;

    } catch (error) {
        console.error('Error scraping YouTube channel videos:', error);
        await browser.close();
        throw error;
    }
}

// Helper function to auto-scroll the page
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
            
            // Stop scrolling after 10 seconds to avoid infinite scrolling
            setTimeout(() => {
                clearInterval(timer);
                resolve();
            }, 10000);
        });
    });

    // Wait a bit for any lazy-loaded content
    await new Promise((resolve) => setTimeout(resolve, 2000));
}

// Helper function to check if upload time is within specified days
function isWithinDays(uploadTimeText, days) {
    if (!uploadTimeText || uploadTimeText === 'N/A') {
        return true; // Include videos without upload time info
    }
    
    const text = uploadTimeText.toLowerCase();

    // Check for various time formats
    if (text.includes('second') || text.includes('minute') || text.includes('hour')) {
        return true;
    }

    if (text.includes('day')) {
        const match = text.match(/(\d+)\s*day/);
        if (match) {
            const daysAgo = parseInt(match[1]);
            return daysAgo <= days;
        }
    }

    if (text.includes('week')) {
        const match = text.match(/(\d+)\s*week/);
        if (match) {
            const weeksAgo = parseInt(match[1]);
            return weeksAgo * 7 <= days;
        }
    }

    // If it's months or years ago, it's definitely not within the threshold
    if (text.includes('month') || text.includes('year')) {
        return false;
    }

    return false;
}

// Helper function to save to CSV
function saveToCSV(videos, filename) {
    // Create CSV header
    let csvContent = 'Playlist Index,Title,URL,Channel,Duration,Upload Time,Scraped Date\n';

    // Add each video as a row
    videos.forEach(video => {
        // Escape commas and quotes in fields
        const escapedTitle = `"${video.title.replace(/"/g, '""')}"`;
        const escapedChannel = `"${video.channelName.replace(/"/g, '""')}"`;
        const scrapedDate = new Date().toISOString();
        
        csvContent += `${video.playlistIndex},${escapedTitle},${video.url},${escapedChannel},${video.duration},${video.uploadTimeText},${scrapedDate}\n`;
    });

    fs.writeFileSync(filename, csvContent, 'utf-8');
}

// Helper function to save to JSON
function saveToJSON(videos, filename) {
    const data = {
        scrapedDate: new Date().toISOString(),
        totalVideos: videos.length,
        videos: videos
    };
    
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
}

// Main execution
(async () => {
    // Provide a channel or playlist URL via env YT_URL or default to channel/videos
    const inputUrl = process.env.YT_URL || 'https://www.youtube.com/@aiconference/videos';
    const daysThreshold = parseInt(process.env.DAYS || '0', 10); // 0 = all videos

    try {
        const isPlaylist = /\/playlist\?list=/.test(inputUrl);
        if (isPlaylist) {
            console.log('Starting YouTube playlist extraction...');
            const playlistVideos = await getYouTubePlaylistVideos(inputUrl, daysThreshold);
            if (playlistVideos.length === 0) {
                console.log('No videos found in the playlist.');
                return;
            }
            const csvFilename = 'playlist_videos.csv';
            saveToCSV(playlistVideos, csvFilename);
            console.log(`\nVideo data saved to ${csvFilename}`);
            const jsonFilename = 'playlist_videos.json';
            saveToJSON(playlistVideos, jsonFilename);
            console.log(`Video data also saved to ${jsonFilename}`);
            console.log(`\nTotal videos extracted: ${playlistVideos.length}`);
        } else {
            console.log('Starting YouTube channel extraction...');
            const channelVideos = await getYouTubeChannelVideos(inputUrl, daysThreshold);
            if (channelVideos.length === 0) {
                console.log('No videos found on the channel videos page.');
                return;
            }
            const csvFilename = 'channel_videos.csv';
            saveToCSV(channelVideos, csvFilename);
            console.log(`\nVideo data saved to ${csvFilename}`);
            const jsonFilename = 'channel_videos.json';
            saveToJSON(channelVideos, jsonFilename);
            console.log(`Video data also saved to ${jsonFilename}`);
            console.log(`\nTotal videos extracted: ${channelVideos.length}`);
        }

    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    }
})();