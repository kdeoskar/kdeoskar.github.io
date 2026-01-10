document.addEventListener('DOMContentLoaded', function() {
    // Check if mobile/small screen
    const isMobile = window.innerWidth <= 768;
    
    // Generate table of contents
    const content = document.querySelector('.blog-article');
    const tocWrapper = document.querySelector('.toc-sticky');
    const toc = document.getElementById('toc');
    const headings = content.querySelectorAll('h2, h3');
    
    headings.forEach((heading, index) => {
        // Add ID to heading for anchor links
        const id = 'heading-' + index;
        heading.id = id;
        
        // Create TOC item
        const li = document.createElement('li');
        li.className = heading.tagName.toLowerCase();
        li.setAttribute('data-heading-id', id);
        const a = document.createElement('a');
        a.href = '#' + id;
        a.textContent = heading.textContent;
        li.appendChild(a);
        toc.appendChild(li);
    });
    
    // Position TOC items based on heading positions (desktop only)
    function positionTOCItems() {
        // Skip positioning on mobile - TOC is hidden
        if (window.innerWidth <= 768) return;
        
        const topPadding = 80; // CUSTOMIZE: Padding at top (default: 10)
        const bottomPadding = 80; // CUSTOMIZE: Padding at bottom (default: 10)
        const tocHeight = tocWrapper.offsetHeight - 50; // Account for title
        const availableHeight = tocHeight - topPadding - bottomPadding;
        
        const tocItems = Array.from(toc.querySelectorAll('li'));
        const numItems = tocItems.length;
        
        if (numItems === 0) return;
        
        // Calculate equal spacing
        const spacing = numItems > 1 ? availableHeight / (numItems - 1) : 0;
        
        // Position items at equal distances
        tocItems.forEach((item, index) => {
            const position = topPadding + (index * spacing);
            item.style.top = position + 'px';
        });
    }
    
    // Initial positioning (desktop only)
    if (!isMobile) {
        positionTOCItems();
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                positionTOCItems();
            }
        });
    }
    
    // Smooth scroll for TOC links
    toc.addEventListener('click', function(e) {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const target = document.querySelector(e.target.getAttribute('href'));
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    // Highlight active section (desktop only)
    function highlightTOC() {
        // Skip highlighting on mobile - TOC is hidden
        if (window.innerWidth <= 768) return;
        
        const scrollPos = window.scrollY + 150;
        const windowBottom = scrollPos + window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        
        // If we're at the bottom of the page, highlight the last item
        if (windowBottom >= docHeight - 10) {
            toc.querySelectorAll('a').forEach(a => a.classList.remove('active'));
            const lastLink = toc.querySelector(`a[href="#${headings[headings.length - 1].id}"]`);
            if (lastLink) lastLink.classList.add('active');
            return;
        }
        
        let activeFound = false;
        headings.forEach((heading, index) => {
            const section = heading;
            const sectionTop = section.offsetTop;
            const nextSection = headings[index + 1];
            const sectionBottom = nextSection ? nextSection.offsetTop : document.documentElement.scrollHeight;
            const tocLink = toc.querySelector(`a[href="#${section.id}"]`);
            
            if (scrollPos >= sectionTop && scrollPos < sectionBottom && !activeFound) {
                toc.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                if (tocLink) {
                    tocLink.classList.add('active');
                    activeFound = true;
                }
            }
        });
    }
    
    if (!isMobile) {
        window.addEventListener('scroll', highlightTOC);
        highlightTOC();
    }
});