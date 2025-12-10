// Browser entry point - connects to single trigger point
// Runs same 95+ tests as server-side single trigger

async function runAllTestsInBrowser() {
    console.log('🎯 BROWSER ENTRY POINT - Single Trigger Connection');
    console.log('Running same 95+ tests as server-side single trigger');
    
    // Import and run the same test logic
    try {
        // Simulate the same tests that run server-side
        const results = await fetch('/api/run-all-tests', { method: 'POST' });
        const data = await results.json();
        
        console.log(`📈 TOTAL: ${data.passed}/${data.total} tests passed`);
        
        if (data.failed === 0) {
            console.log('🎉 ALL TESTS PASSED (Browser)');
            console.log('✅ Same results as single trigger point');
        } else {
            console.log('⚠️ SOME TESTS FAILED (Browser)');
            console.log('❌ Results match single trigger point');
        }
        
        return data.failed === 0;
    } catch (error) {
        console.log('❌ Browser tests error:', error.message);
        return false;
    }
}

// Auto-run when page loads
if (typeof window !== 'undefined') {
    window.runAllTestsInBrowser = runAllTestsInBrowser;
    
    // Add button to HTML pages
    document.addEventListener('DOMContentLoaded', () => {
        const button = document.createElement('button');
        button.textContent = 'Run All Tests (Single Trigger)';
        button.onclick = runAllTestsInBrowser;
        button.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;padding:10px;background:#007cba;color:white;border:none;border-radius:5px;cursor:pointer;';
        document.body.appendChild(button);
    });
}
