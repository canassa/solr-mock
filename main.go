package main

import (
	"encoding/json"
	"fmt"
	"net/http"
)

func solrSelectHandler(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	fmt.Println(r.Form)
	fmt.Printf("Method: %s URL: %s\n", r.Method, r.URL.Path)

	w.Header().Set("Content-Type", "application/json")

	solrResponse, _ := json.Marshal(map[string]interface{}{
		"responseHeader": map[string]interface{}{
			"status": 0,
			"QTime":  0,
			"params": map[string]interface{}{
				"fl":    0,
				"start": 0,
				"q":     0,
				"wt":    "json",
				"fq":    0,
				"rows":  0,
			},
		},
		"response": map[string]interface{}{
			"numFound": 0,
			"start":    0,
			"maxScore": 0.48526156,
			"docs":     0,
		},
	})

	fmt.Fprint(w, string(solrResponse))
}

func soltUpdateHandler(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	fmt.Println(r.Form)
	fmt.Printf("Method: %s URL: %s\n", r.Method, r.URL.Path)

	w.Header().Set("Content-Type", "application/xml")
	response := `<?xml version="1.0" encoding="UTF-8"?>
		<response>
			<lst name="responseHeader"><int name="status">0</int><int name="QTime">15</int></lst>
		</response>`

	fmt.Fprintf(w, response)
}

func main() {
	http.HandleFunc("/solr/select/", solrSelectHandler)
	http.HandleFunc("/solr/update/", soltUpdateHandler)

	http.ListenAndServe(":8001", nil)
}
