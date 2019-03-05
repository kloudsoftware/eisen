export class HttpClient {
    private basePath: string;
    constructor(basePath: string) {
        this.basePath = basePath;
    }

    peformGet <T> (path: string): T {
        let http = new XMLHttpRequest();
        http.open("GET", this.basePath + path, false);
        http.send(null);
        let response = http.responseText;
        return JSON.parse(response) as T;
    }

    performPost(path: string, data: any, contentType = "application/json") {
        let http = new XMLHttpRequest();
        http.setRequestHeader("Content-Type", contentType);
        http.send(data);
    }

}
