function get_genid(t,e){t.get("genid").then(function(t){e(t.data)})}function get_genuuid(t,e){t.get("genuuid").then(function(t){e(t.data)})}function get_streams(t,e,o){t.get("status",{params:{dir_uuid:e}}).then(function(t){o(t.data)})}function get_stats(t,e){t.get("stats").then(function(t){e(t.data)})}angular.module("sbApp",["angularFileUpload","ja.qr","ngStorage","ngRoute","sb.main","sb.dir"]).filter("bytes",function(){return function(t,e){if(0===t)return"0 bytes";if(isNaN(parseFloat(t))||!isFinite(t))return"-";"undefined"==typeof e&&(e=1);var o=["bytes","kB","MB","GB","TB","PB"],n=Math.floor(Math.log(t)/Math.log(1024)),r=(t/Math.pow(1024,Math.floor(n))).toFixed(e);return(r.match(/\.0*$/)?r.substr(0,r.indexOf(".")):r)+" "+o[n]}}).service("anchorSmoothScroll",function(){this.scrollTo=function(t){function e(){return self.pageYOffset?self.pageYOffset:document.documentElement&&document.documentElement.scrollTop?document.documentElement.scrollTop:document.body.scrollTop?document.body.scrollTop:0}function o(t){for(var e=document.getElementById(t),o=e.offsetTop,n=e;n.offsetParent&&n.offsetParent!=document.body;)n=n.offsetParent,o+=n.offsetTop;return o}var n=e(),r=o(t),i=r>n?r-n:n-r;if(i<100)return void scrollTo(0,r);var u=Math.round(i/20);u>=20&&(u=20);var a,l=Math.round(i/25),f=r>n?n+l:n-l,d=0;if(r>n)for(a=n;a<r;a+=l)setTimeout("window.scrollTo(0, "+f+")",d*u),f+=l,f>r&&(f=r),d++;else for(a=n;a>r;a-=l)setTimeout("window.scrollTo(0, "+f+")",d*u),f-=l,f<r&&(f=r),d++}}).config(["$routeProvider",function(t){t.when("/",{templateUrl:"main/main.html",controller:"mainCtrl"}).when("/dir/:directoryId",{templateUrl:"dir/dir.html",controller:"dirCtrl"}).otherwise({redirectTo:"/"})}]);