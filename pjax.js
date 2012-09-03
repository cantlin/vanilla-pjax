(function() {

    pjax = {

        opts: {
            els: {
                container: 'container',
                loader:    'loader'
            },

            transition: false
        },

        bind: function(nodes) {
            var i;

            nodes = nodes.length === undefined ? [nodes] : nodes;

            for(i = 0; i < nodes.length; i++) {
                nodes[i].addEventListener('click', function(e) {
                    pjax.handle.call(this, event);
                });
            };
        },

        handle: function(event) {
            var href;

            href = this.getAttribute('data-pjax') || this.href;

            if(href && pjax.supported && !event.metaKey && !event.ctrlKey && this.target !== '_blank') {
                event.preventDefault();

                return pjax.request(href);
            }

            return false;            
        },

        request: function(uri, push) {
            var self, push, container, loader, req, start;

            self = this;
            push = push === undefined ? true : push;

            container = this.el('container');
            loader    = this.el('loader');

            req   = new pjax.xhr();
            start = (new Date).getTime();

            if(self.opts.transition) {
                container.style.opacity = 0;

                setTimeout(function() {
                    loader.style.visibility = 'visible';
                    loader.style.opacity    = 1;
                }, parseInt(self.opts.transition / 3));
            }

            req.onreadystatechange = function() {
                if(req.readyState === 4 && req.status === 200) {
                    var matches, requestTime, remainingTransitionTime, wait;

                    if(matches = req.responseText.match(/<title>(.*)<\/title>/)) {
                        document.title = matches[1];
                    }

                    if(push) {
                        window.history.pushState({ url: uri }, document.title, uri);
                    }

                    wait = 0;
                    if(self.opts.transition) {
                        requestTime = (new Date).getTime() - start;
                        remainingTransitionTime = self.opts.transition - requestTime;

                        wait = remainingTransitionTime > 0 ? remainingTransitionTime : wait;
                    }

                    setTimeout(function() {
                        loader.style.visibility = 'hidden';
                        loader.style.opacity    = 0;

                        container.style.opacity = 1;

                        self.populate(container, req.responseText);
                        self.setActiveLinks(uri);
                    }, wait);
                }
            };

            req.open('GET', uri);
            req.setRequestHeader('X-PJAX', true);
            req.send();

            return true;
        },

        populate: function(container, html, executeScripts) {
            var el, inlineScripts, externalScripts, script, src, i;

            executeScripts = executeScripts === undefined ? true : executeScripts;
            inlineScripts = [], externalScripts = [];

            el = document.createElement('div');
            el.innerHTML = html;

            for(i = 0; i < el.childNodes.length; i++) {
                if(el.childNodes[i].tagName === "SCRIPT") {
                    if(executeScripts) {
                        src = el.childNodes[i].src;
                        if(src !== undefined && src !== '') {
                            externalScripts.push(src);
                        } else {
                            inlineScripts.push(el.childNodes[i].text);
                        }
                    }

                    el.removeChild(el.childNodes[i]);
                }

                if(el.childNodes[i] && el.childNodes[i].tagName === "A") {
                    pjax.bind(el.childNodes[i]);
                }
            }

            container.innerHTML = el.innerHTML;

            if(executeScripts) {
                while(src = externalScripts.shift()) {
                    if(this._requestedScripts.indexOf(src) === -1) {
                        this._requestedScripts.push(src);

                        script      = document.createElement('script');
                        script.type = 'text/javascript';
                        script.src  = src;

                        document.head.appendChild(script);
                        document.head.removeChild(script);
                    }
                }

                script      = document.createElement('script');
                script.type = 'text/javascript';
                script.text = inlineScripts.join("\n");

                document.head.appendChild(script);
                document.head.removeChild(script);
            }
        },

        xhr: function() {
            if(window.XMLHttpRequest) return new XMLHttpRequest();

            if(window.ActiveXObject) {
                try      { return new ActiveXObject("Msxml2.XMLHTTP"); }
                catch(e) { return new ActiveXObject("Microsoft.XMLHTTP"); }
            }
        },

        supported: (function() {
            return !!(window.history && history.pushState);
        }()),

        el: function(key) {
            return this._els[key] ? this._els[key] : (this._els[key] = document.getElementById(this.opts.els[key]));
        },

        setActiveLinks: function(uri) {
            var nodes, i;

            nodes = document.getElementsByTagName('a');
            for(i = 0; i < nodes.length; i++) {
                nodes[i].href === uri
                    ? nodes[i].className = nodes[i].className + ' active'
                    : nodes[i].className = nodes[i].className.replace('active', '').trim();
            }
        },

        _els: {},
        _requestedScripts: []
    };

    var popped    = ('state' in window.history),
        initHref  = location.href;

    window.addEventListener('popstate', function(e) {
        var firstPop;

        firstPop = !popped && location.href == firstHref;
        popped = true;
        if(firstPop) return;

        if(e.state && e.state.url) {
            pjax.request(e.state.url, false);
        }
    });

    window.pjax = pjax;
})();

(function() {
    pjax.opts.transition = 600;
    pjax.bind(document.getElementsByTagName('a'));
    pjax.setActiveLinks(location.href);

    // window.history.pushState({ url: location.href }, document.title, location.href);
})();
