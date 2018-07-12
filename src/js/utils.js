export function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'), sParameterName, i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

export function updateQueryStringParameter(uri, key, value) {
    var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
    var separator = uri.indexOf('?') !== -1 ? "&" : "?";
    if (uri.match(re)) {
        return uri.replace(re, '$1' + key + "=" + value + '$2');
    }
    else {
        return uri + separator + key + "=" + value;
    }
}

export function openInNewTab(url) {
    var win = window.open(url, '_blank');
    win.focus();
}

export function trySearch(text, search) {
    let urlEncodade = encodeURIComponent('"' + text.trim() + '"').replace(/%20/g, '+');
    let url = `/deputy?search_query=${urlEncodade}`
    url = search ? url + `&searchId=${search.id}` : url
    return openInNewTab(url);
}