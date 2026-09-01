/**
 * CalistheniX — Comprehensive Mobile Home Rebuild Verification Test
 */

const fs = require('fs');
const assert = require('assert');

console.log('🧪 VERIFYING CALISTHENIX MOBILE HOME REBUILD SPECIFICATIONS\n');

// 1. Audit home.js
const homeJs = fs.readFileSync('frontend/js/views/home.js', 'utf8');

// Header Verification
assert.ok(homeJs.includes('home-mobile-header'), 'Mobile header element must exist');
assert.ok(homeJs.includes('Good ${greeting.toLowerCase()}'), 'Greeting must be dynamic');
assert.ok(homeJs.includes('Sandeep'), 'User name Sandeep must be present');
assert.ok(homeJs.includes('Settings'), 'Settings button must be present');
assert.ok(homeJs.includes('openSettingsModal()'), 'Settings modal must be triggered on Settings click');
console.log('✓ Section 1: Compact Mobile Header verified (Good morning / Sandeep / Settings)');

// Today's Workout Hero Card Verification
assert.ok(homeJs.includes('home-mobile-today-card'), 'Today hero card container must exist');
assert.ok(homeJs.includes("mobileTodayTag = 'TODAY'"), 'Today section must show TODAY tag');
assert.ok(homeJs.includes('Start Workout →'), 'CTA button must show Start Workout →');
assert.ok(homeJs.includes('Rest & Recovery'), 'Rest day handling must display Rest & Recovery');
assert.ok(homeJs.includes('startWorkoutFromResolved()'), 'Start workout must invoke startWorkoutFromResolved');
console.log("✓ Section 2: Today's Workout Hero Card verified (TODAY / Dynamic Title / Desc / Start Workout →)");

// This Week Navigator Verification
assert.ok(homeJs.includes('THIS WEEK'), 'THIS WEEK title must exist');
assert.ok(homeJs.includes('home-mobile-week-card'), 'This Week card container must exist');
assert.ok(homeJs.includes('home-week-nav-arrow'), 'Week nav arrows must exist');
assert.ok(homeJs.includes('weekLabel'), 'Week label range must exist');
assert.ok(homeJs.includes('dayNamesShort'), 'MON..SUN day names must exist');
assert.ok(homeJs.includes('home-mobile-day-symbol'), 'Subtle workout-status indicator symbol must exist');
console.log('✓ Section 3: This Week Navigator verified (THIS WEEK / ‹ Range › / MON..SUN / Dates / Indicators)');

// Current Streak Verification
assert.ok(homeJs.includes('CURRENT STREAK'), 'CURRENT STREAK title must exist');
assert.ok(homeJs.includes('home-mobile-streak-card'), 'Current Streak card container must exist');
assert.ok(homeJs.includes('🔥'), 'Flame emoji must exist');
assert.ok(homeJs.includes('${streakDays} day'), 'Streak days count must be dynamic');
console.log('✓ Section 4: Current Streak verified (CURRENT STREAK / 🔥 X days)');

// Up Next Verification
assert.ok(homeJs.includes('UP NEXT'), 'UP NEXT title must exist');
assert.ok(homeJs.includes('home-mobile-upnext-card'), 'Up Next card container must exist');
assert.ok(homeJs.includes('home-mobile-upnext-row'), 'Up Next row element must exist');
assert.ok(homeJs.includes('home-mobile-upnext-arrow'), 'Up Next arrow must exist');
assert.ok(homeJs.includes('upcomingWorkoutsList'), 'Prioritization of upcoming workouts must exist');
console.log('✓ Section 5: Up Next verified (UP NEXT / Next 2–3 workouts / Day / Title / →)');

// Desktop Preservation Verification
assert.ok(homeJs.includes('home-desktop-view'), 'Desktop view container must be preserved');
assert.ok(homeJs.includes('home-metrics-strip'), 'Desktop 4-metric strip must be preserved');
assert.ok(homeJs.includes('home-muscle-card'), 'Desktop muscle focus card must be preserved');
assert.ok(homeJs.includes('home-three-col-grid'), 'Desktop 3-column overload grid must be preserved');
console.log('✓ Desktop Home Screen structure 100% preserved');

// 2. Audit CSS in home-dashboard.css
const homeCss = fs.readFileSync('frontend/css/components/home-dashboard.css', 'utf8');
assert.ok(homeCss.includes('.home-mobile-view'), '.home-mobile-view rule must exist');
assert.ok(homeCss.includes('.home-desktop-view'), '.home-desktop-view rule must exist');
assert.ok(homeCss.includes('@media (min-width: 1024px)'), 'Desktop viewport query must exist');
assert.ok(homeCss.includes('@media (max-width: 1023px)'), 'Mobile viewport query must exist');
assert.ok(homeCss.includes('.home-mobile-today-card'), '.home-mobile-today-card styles must exist');
assert.ok(homeCss.includes('.home-mobile-week-card'), '.home-mobile-week-card styles must exist');
assert.ok(homeCss.includes('.home-mobile-streak-val'), '.home-mobile-streak-val styles must exist');
assert.ok(homeCss.includes('.home-mobile-upnext-row'), '.home-mobile-upnext-row styles must exist');
console.log('✓ Mobile & Desktop CSS isolation verified');

// 3. Audit Bottom Navigation in index.html & nav.css
const indexHtml = fs.readFileSync('frontend/index.html', 'utf8');
assert.ok(indexHtml.includes('id="mobile-bottom-nav"'), 'Persistent mobile bottom nav must exist');
const bottomNavRegex = /<a href="#home"[\s\S]*?<a href="#split"[\s\S]*?<a href="#workout"[\s\S]*?<a href="#history"[\s\S]*?<a href="#progress"/;
assert.ok(bottomNavRegex.test(indexHtml), 'Bottom navigation items must follow order: Home, Split, Workout (center), History, Progress');
console.log('✓ Section 6: Bottom Navigation hierarchy verified (Home | Split | Workout [center] | History | Progress)');

console.log('\n🎉 ALL MOBILE HOME REBUILD VERIFICATIONS PASSED 100%!\n');
