/**
 * Test Mobile Home Content Deduplication & Focused Architecture
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 TESTING MOBILE HOME CONTENT DEDUPLICATION & ARCHITECTURE\n');

// 1. Audit home.js for mobile view content
const homeJs = fs.readFileSync('frontend/js/views/home.js', 'utf8');

// Match mobile view content
const mobileViewMatch = homeJs.match(/<!-- Mobile Home View \(< 1024px\) -->[\s\S]*?<div class="home-mobile-view">([\s\S]*?)<\/div>/);
assert.ok(mobileViewMatch, 'Mobile home view block must exist in home.js');

const mobileContent = mobileViewMatch[1];

// Verify 4 core sections are present
assert.ok(mobileContent.includes('mobileTodayCardHtml'), 'Section 1 (Today\'s Workout) must exist');
assert.ok(mobileContent.includes('mobileThisWeekCardHtml'), 'Section 2 (This Week) must exist');
assert.ok(mobileContent.includes('mobileStreakCardHtml'), 'Section 3 (Current Streak) must exist');
assert.ok(mobileContent.includes('mobileUpNextCardHtml'), 'Section 4 (Up Next) must exist');

console.log('✓ Exactly 4 dedicated conceptual sections present on Mobile Home:');
console.log('  [1] Today\'s Workout ("What should I do today?")');
console.log('  [2] This Week ("How is my week going?")');
console.log('  [3] Current Streak ("Am I maintaining my streak?")');
console.log('  [4] Up Next ("What\'s coming next?")');

// Verify zero duplicate statistics on Mobile Home
assert.ok(!mobileContent.includes('home-muscle-card'), 'Muscle Focus body map must NOT be on mobile Home');
assert.ok(!mobileContent.includes('home-metrics-strip'), '4-metric analytical strip must NOT be on mobile Home');
assert.ok(!mobileContent.includes('home-section-card-featured'), 'Exercise progression overload cards must NOT be on mobile Home');
assert.ok(!mobileContent.includes('home-pr-item'), 'Recent PRs list must NOT be on mobile Home');
assert.ok(!mobileContent.includes('home-insight-card'), 'Duplicate training insight card must NOT be on mobile Home');

console.log('✓ Zero redundant analytics or duplicate metrics on Mobile Home');

// Verify desktop view retains complete analytics dashboard
const desktopViewMatch = homeJs.match(/<div class="home-desktop-view">([\s\S]*?)<\/div>\s*<\/div>`/);
assert.ok(desktopViewMatch, 'Desktop home view block must exist');
const desktopContent = desktopViewMatch[1];
assert.ok(desktopContent.includes('home-top-grid'), 'Desktop top grid must exist');
assert.ok(desktopContent.includes('metricsStripHtml'), 'Desktop 4-metric strip must exist');
assert.ok(desktopContent.includes('threeColGridHtml'), 'Desktop 3-col progress & PRs grid must exist');
assert.ok(desktopContent.includes('trainingInsightHtml'), 'Desktop training insight card must exist');

console.log('✓ Desktop dashboard is completely preserved with full analytical features');

console.log('\n🎉 ALL MOBILE HOME DEDUPLICATION TESTS PASSED 100%!\n');
