package main

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
        _ "embed"

	badger "github.com/dgraph-io/badger/v4"
	"github.com/google/uuid"
)

//go:embed lolpizza2.user.js
var script []byte

var db *badger.DB

type BasketMeta struct {
  Url string
  Locked bool
  ActiveAddress string
}

func putBasket(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	name := r.URL.Query().Get("name")
	err := db.Update(func(txn *badger.Txn) error {
                metaItem, err := txn.Get([]byte(id+"-meta"))
                if err == badger.ErrKeyNotFound {
                  w.WriteHeader(http.StatusNotFound)
                  w.Write([]byte("Basket not found"))
                  return nil
                }
                var metaValue []byte
                if err = metaItem.Value(func(val []byte) error {
                  metaValue = append([]byte{}, val...)
                  return nil
                }); err != nil {
                  return err
                }
                var meta BasketMeta
                if err = json.Unmarshal(metaValue, &meta); err != nil {
                  return err
                }
                if meta.Locked {
                  w.WriteHeader(http.StatusForbidden)
                  w.Write([]byte("Basket is locked"))
                  return nil
                }
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
	activeAddress := r.URL.Query().Get("activeAddress")
        js, err := json.Marshal(BasketMeta{Url: url, Locked: false, ActiveAddress: activeAddress})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
                return
	}
	err = db.Update(func(txn *badger.Txn) error {
		txn.Set([]byte(id), []byte("{}"))
		txn.Set([]byte(id+"-meta"), js)
		return nil
	})
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(err.Error()))
                return
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
                var content map[string]interface{}
                if err = json.Unmarshal(value, &content); err != nil {
                  return err
                }


                var metaValue []byte
                metaItem, err := txn.Get([]byte(id+"-meta"))
                if err != nil {
                  return err
                }
                if err = metaItem.Value(func(val []byte) error {
                  metaValue = append([]byte{}, val...)
                  return nil
                }); err != nil {
                  return err
                }
                var meta BasketMeta
                if err = json.Unmarshal(metaValue, &meta); err != nil {
                  return err
                }

                bts, err := json.Marshal(map[string]interface{}{"content": content, "meta": meta})
                if err != nil {
                  return err
                }

		w.WriteHeader(http.StatusOK)
		w.Header().Set("Content-Type", "application/json")
		w.Write(bts)
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

func lockHandler(w http.ResponseWriter, r *http.Request) {
  unlock := r.URL.Query().Get("unlock")
  if r.Method != "POST" {
    w.WriteHeader(http.StatusMethodNotAllowed)
    w.Write([]byte("Method not allowed"))
    return
  }
  id := r.URL.Query().Get("id")
  err := db.Update(func(txn *badger.Txn) error {
    item, err := txn.Get([]byte(id+"-meta"))
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
    var basketMeta BasketMeta
    if err = json.Unmarshal(value, &basketMeta); err != nil {
      return err
    }
    basketMeta.Locked = unlock != "true"
    basketMetaBytes, err := json.Marshal(basketMeta)
    if err != nil {
      return err
    }
    w.WriteHeader(http.StatusOK)
    w.Header().Set("Content-Type", "application/json")
    w.Write(basketMetaBytes)
    return txn.Set([]byte(id+"-meta"), basketMetaBytes)
  })
  if err != nil {
    w.WriteHeader(http.StatusInternalServerError)
    w.Write([]byte(err.Error()))
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
        http.HandleFunc("/basket/lock", CORS(lockHandler))
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
	http.HandleFunc("/a", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Loading"))
	})
        http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
          http.Redirect(w, r, "/lolpizza2.user.js", http.StatusTemporaryRedirect)
        })
        http.HandleFunc("/lolpizza2.user.js", func(w http.ResponseWriter, r *http.Request) {
          w.Header().Set("Content-Type", "application/javascript")
          w.Write(script)
        })
	uri := ":8080"
	if len(os.Args) > 1 {
		uri = os.Args[1]
	}
	log.Printf("Listening on %s", uri)
	log.Fatal(http.ListenAndServe(uri, nil))
}
