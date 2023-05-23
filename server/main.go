package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	badger "github.com/dgraph-io/badger/v4"
	"github.com/google/uuid"
)

var db *badger.DB

func putBasket(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	name := r.URL.Query().Get("name")
	err := db.Update(func(txn *badger.Txn) error {
		currentBasket, err := txn.Get([]byte(id))
		var value []byte
		basket := make(map[string]interface{})
		ownBasket := []interface{}{}
		if err == badger.ErrKeyNotFound {
			value = []byte("{}")
		} else if err != nil {
			return err
		} else {
			currentBasket.Value(func(val []byte) error {
				value = append([]byte{}, val...)
				return nil
			})
		}
		if err = json.Unmarshal(value, &basket); err != nil {
			return err
		}
		body, err := ioutil.ReadAll(r.Body)
		if err != nil {
			return err
		}
		if err = json.Unmarshal(body, &ownBasket); err != nil {
			return err
		}
		basket[name] = ownBasket
		basketBytes, err := json.Marshal(basket)
		if err != nil {
			return err
		}
		w.Write(basketBytes)
		return txn.Set([]byte(id), basketBytes)
	})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
	}
}

func postBasket(w http.ResponseWriter, r *http.Request) {
	id := uuid.New().String()
        url := r.URL.Query().Get("url")
	err := db.Update(func(txn *badger.Txn) error {
		txn.Set([]byte(id), []byte("{}"))
                txn.Set([]byte(id+"-meta"), []byte(url))
		return nil
	})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
	}
	w.Write([]byte(id))
}

func getBasket(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	err := db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte(id))
		if err == badger.ErrKeyNotFound {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("Basket not found"))
			return nil
		} else if err != nil {
			return err
		}
		var value []byte
		if err = item.Value(func(val []byte) error {
			value = append([]byte{}, val...)
			return nil
		}); err != nil {
			return err
		}
		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		w.Write(value)
		return nil
	})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
	}
}

func deleteBasket(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	err := db.Update(func(txn *badger.Txn) error {
		return txn.Delete([]byte(id))
	})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
	} else {
          w.WriteHeader(http.StatusOK)
          w.Write([]byte("Basket deleted"))
        }
}


// combine handlers into one
func basketHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "GET":
		getBasket(w, r)
	case "POST":
		postBasket(w, r)
	case "PUT":
		putBasket(w, r)
	case "DELETE":
		deleteBasket(w, r)
	}
}

func CORS(next http.HandlerFunc) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request) {
    w.Header().Add("Access-Control-Allow-Origin", "*")
    w.Header().Add("Access-Control-Allow-Credentials", "true")
    w.Header().Add("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
    w.Header().Add("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")

    if r.Method == "OPTIONS" {
        http.Error(w, "No Content", http.StatusNoContent)
        return
    }

    next(w, r)
  }
}

func main() {
	var err error
	db, err = badger.Open(badger.DefaultOptions("").WithInMemory(true))
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	http.HandleFunc("/basket", CORS(basketHandler))
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
        http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
          // describe usage
          w.WriteHeader(http.StatusOK)
          w.Header().Set("Content-Type", "text/plain")
          w.Write([]byte("LolPizza2 Basket API\n"))
          w.Write([]byte("\n"))
          w.Write([]byte("Usage: \n"))
          w.Write([]byte("GET /basket?id=<basket_id> - get basket\n"))
          w.Write([]byte("returns basket json of form: { \"name\": Basket }\n"))
          w.Write([]byte("\n"))

          w.Write([]byte("POST /basket - create basket\n"))
          w.Write([]byte("returns basket id as string\n"))
          w.Write([]byte("\n"))

          w.Write([]byte("PUT /basket?id=<basket_id>&name=<user_name> - add own basket to basket\n"))
          w.Write([]byte("returns basket json of form: { \"name\": Basket }\n"))
          w.Write([]byte("\n"))

          w.Write([]byte("DELETE /basket?id=<basket_id> - delete basket\n"))
          w.Write([]byte("returns \"Basket deleted\"\n"))

        })
        http.HandleFunc("/id/:id", func(w http.ResponseWriter, r *http.Request) {
          // generate HowTo
        })
        http.HandleFunc("/host", func(w http.ResponseWriter, r *http.Request) {
          // generate HowTo
        })
          
        uri := ":8080"
        if len(os.Args) > 1 {
          uri = os.Args[1]
        }
        log.Printf("Listening on %s", uri)
	log.Fatal(http.ListenAndServe(uri, nil))
}
