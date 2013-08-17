package main

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"net/http"
	"io/ioutil"
	"regexp"
)

type DbEntry struct {
	Repository string
	Path string
}

var Db map[string]DbEntry

type Field struct {
	Name string `xml:"name,attr"`
	Value string `xml:",chardata"`
}

type AddEntry struct {
	XMLName xml.Name `xml:"add"`
	Fields  []Field `xml:"doc>field"`
}

var queryRegex = regexp.MustCompile(`\(repository:(\d+) AND (.+)\)`)
func findEntries(queryString string) {
	res := queryRegex.FindAllStringSubmatch(queryString, -1)[0]
	fmt.Println(res[2])
}

func solrSelectHandler(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()

	// fmt.Println(r.Form)
	// fmt.Printf("Method: %s URL: %s\n", r.Method, r.URL.Path)

	findEntries(r.FormValue("q"))

	w.Header().Set("Content-Type", "application/json")

	solrResponse, _ := json.Marshal(map[string]interface{}{
		"responseHeader": map[string]interface{}{
			"status": 0,
			"QTime":  0,
			"params": map[string]interface{}{
				"fl":    r.FormValue("fl"),
				"start": r.FormValue("start"),
				"q":     r.FormValue("q"),
				"wt":    "json",
				"fq":    r.FormValue("fq"),
				"rows":  r.FormValue("rows"),
			},
		},
		"response": map[string]interface{}{
			"numFound": 0,
			"start":    0,
			"maxScore": 0.48526156,
			"docs":     [0]string{},
		},
	})

	fmt.Fprint(w, string(solrResponse))
}

func solrUpdateHandler(w http.ResponseWriter, r *http.Request) {
	// r.ParseForm()
	body, _ := ioutil.ReadAll(r.Body)
	// fmt.Printf("%s\n\n", body)

	result := AddEntry{}
	err := xml.Unmarshal(body, &result)
	if (err == nil) {
		// fmt.Println(result.Fields)
		for _, value := range result.Fields {
			switch value.Name {
			case "id":
				// fmt.Println(value.Value)
			}
		}
	}

	w.Header().Set("Content-Type", "application/xml")
	response := `<?xml version="1.0" encoding="UTF-8"?>
		<response>
			<lst name="responseHeader">
				<int name="status">0</int>
				<int name="QTime">15</int>
			</lst>
		</response>`

	fmt.Fprintf(w, response)
}

func main() {
	http.HandleFunc("/solr/select/", solrSelectHandler)
	http.HandleFunc("/solr/update/", solrUpdateHandler)

	http.ListenAndServe(":8001", nil)
}
