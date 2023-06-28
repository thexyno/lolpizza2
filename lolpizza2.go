package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
        _ "embed"

	"github.com/alexandrevicenzi/go-sse"
)

type basket struct {
	HasPaid        []string
	RestaurantInfo interface{}
	Cookie         string
	BasketItems    map[string]interface{}
	Motd           string
	Locked         bool
}
type basketPutInput struct {
	HasPaid        []string
	RestaurantInfo interface{}
	Motd           string
	Locked         bool
}
type basketPostInput struct {
	RestaurantInfo interface{}
	Cookie         string
	Motd           string
}

type basketAddInput struct {
	Name        string
	BasketItems interface{}
}

//go:embed frontend/dist/lolpizza2.user.js
var userScript []byte

const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func randomString(n int) string {
	sb := strings.Builder{}
	sb.Grow(n)
	for i := 0; i < n; i++ {
		sb.WriteByte(charset[rand.Intn(len(charset))])
	}
	return sb.String()
}

var baskets = make(map[string]*basket)
var basketSecrets = make(map[string]string)
var basketMutex = &sync.Mutex{}

var updateChannel = make(chan string)

func main() {
	http.HandleFunc("/basket", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		id := r.URL.Query().Get("id")
		secret := r.URL.Query().Get("secret")
		switch r.Method {
		case "GET":
			if id == "" {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte("{\"status\": \"error\", \"message\": \"id is required\"}"))
				return
			}
			basketMutex.Lock()
			if baskets[id] == nil {
				w.WriteHeader(http.StatusNotFound)
				w.Write([]byte("{\"status\": \"error\", \"message\": \"basket not found\"}"))
				basketMutex.Unlock()
				return
			}
			bytes, err := json.Marshal(struct {
				Status  string
				Message basket
			}{Status: "success", Message: *baskets[id]})
			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte("{\"status\": \"error\", \"message\": \"internal error\"}"))
				basketMutex.Unlock()
				return
			}
			basketMutex.Unlock()
			w.WriteHeader(http.StatusOK)
			w.Write(bytes)
		case "POST":
			id = randomString(10)
			var input basketPostInput
			err := json.NewDecoder(r.Body).Decode(&input)
			if err != nil {
				w.Write([]byte("{\"status\": \"error\", \"message\": \"invalid json\"}"))
				w.WriteHeader(http.StatusBadRequest)
				return
			}

			basketMutex.Lock()
			baskets[id] = &basket{
				RestaurantInfo: input.RestaurantInfo,
				Motd:           input.Motd,
				Cookie:         input.Cookie,
				BasketItems:    make(map[string]interface{}),
				HasPaid:        []string{},
			}
			basketSecrets[id] = randomString(10)
			basketMutex.Unlock()
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("{\"status\": \"ok\", \"id\": \"" + id + "\", \"secret\": \"" + basketSecrets[id] + "\"}"))
		case "PUT":
			if id == "" {
				w.Write([]byte("{\"status\": \"error\", \"message\": \"id is required\"}"))
				w.WriteHeader(http.StatusBadRequest)
				return
			}
			basketMutex.Lock()
			if baskets[id] == nil {
				w.WriteHeader(http.StatusNotFound)
				w.Write([]byte("{\"status\": \"error\", \"message\": \"basket not found\"}"))
				basketMutex.Unlock()
				return
			}
			if secret != basketSecrets[id] {
				w.Write([]byte("{\"status\": \"error\", \"message\": \"secret is invalid\"}"))
				w.WriteHeader(http.StatusUnauthorized)
				basketMutex.Unlock()
				return
			}
			var putInput basketPutInput
			err := json.NewDecoder(r.Body).Decode(&putInput)
			if err != nil {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte("{\"status\": \"error\", \"message\": \"invalid json\"}"))
				basketMutex.Unlock()
				return
			}
			baskets[id].HasPaid = putInput.HasPaid
			baskets[id].RestaurantInfo = putInput.RestaurantInfo
			baskets[id].Motd = putInput.Motd
			baskets[id].Locked = putInput.Locked
			updateChannel <- id
			w.Write([]byte("{\"status\": \"ok\"}"))
			basketMutex.Unlock()
		}

	})
	http.HandleFunc("/add", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		id := r.URL.Query().Get("id")
		if r.Method != "POST" {
			w.Write([]byte("{\"status\": \"error\", \"message\": \"method not allowed\"}"))
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var input basketAddInput
		err := json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			w.Write([]byte("{\"status\": \"error\", \"message\": \"invalid json\"}"))
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		basketMutex.Lock()
		if baskets[id] == nil {
			w.Write([]byte("{\"status\": \"error\", \"message\": \"basket not found\"}"))
			w.WriteHeader(http.StatusNotFound)
			basketMutex.Unlock()
			return
		}
		baskets[id].BasketItems[input.Name] = input.BasketItems
		updateChannel <- id
		basketMutex.Unlock()
		w.Write([]byte("{\"status\": \"ok\"}"))
	})
	http.HandleFunc("/clear", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		id := r.URL.Query().Get("id")
		if r.Method != "POST" {
			w.WriteHeader(http.StatusMethodNotAllowed)
			w.Write([]byte("{\"status\": \"error\", \"message\": \"method not allowed\"}"))
			return
		}
		var input struct{ Name string }
		err := json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("{\"status\": \"error\", \"message\": \"invalid json\"}"))
			return
		}
		basketMutex.Lock()
		if baskets[id] == nil {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("{\"status\": \"error\", \"message\": \"basket not found\"}"))
			basketMutex.Unlock()
			return
		}
		delete(baskets[id].BasketItems, input.Name)
		updateChannel <- id
		basketMutex.Unlock()
		w.Write([]byte("{\"status\": \"ok\"}"))
	})

	s := sse.NewServer(&sse.Options{
		Headers: map[string]string{
			"Access-Control-Allow-Origin": "*",
		},
	})
	defer s.Shutdown()

	http.Handle("/events/", s)

	go func() {
		for {
			id := <-updateChannel
			basketMutex.Lock()
			bytes, err := json.Marshal(baskets[id])
			basketMutex.Unlock()
			if err != nil {
				log.Println("Error marshalling basket", err)
				continue
			}
			s.SendMessage("/events/"+id, sse.SimpleMessage(string(bytes)))
		}
	}()
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// generate documentation
		w.Write([]byte(`LolPizza2 - a system for colaborative pizza ordering using a userscript and lieferando.de

you can find the userscript at /lolpizza2.user.js - tested to work with violentmonkey

Git: https://github.com/thexyno/lolpizza2

API Documentation
-----------------
GET / - returns this documentation
GET /health - returns "ok" if the server is running
GET /basket?id=<id> - returns the basket with the given id
POST /basket - creates a new basket and returns the id and a secret to modify it
PUT /basket?id=<id>&secret=<secret> - updates the basket with the given id
POST /add?id=<id> - adds a new basket item to the basket with the given id
POST /clear?id=<id>&name=<name> - clears the basket with the given iv for the given name
GET /events/<id> - returns a server sent event stream of updates to the basket with the given id`))
	})
	http.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("User-agent: *\nDisallow: /"))
	})

        http.HandleFunc("/lolpizza2.user.js", func(w http.ResponseWriter, r *http.Request) {
          w.Header().Set("Content-Type", "application/javascript")
          w.Write(userScript)
        })

	port := ":8080"
	if len(os.Args) > 1 {
		port = os.Args[1]
	}
	log.Println("Listening on port", port)
	http.ListenAndServe(port, nil)
}
