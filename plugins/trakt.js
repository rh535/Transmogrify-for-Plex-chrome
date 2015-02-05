trakt = {
    metadata_xml: null,
    server: null,

    init: function(metadata_xml, type, server) {
        trakt.metadata_xml = metadata_xml;
        trakt.server = server;

        if (type === "show") {
            trakt.processShow();
        }
        else if (type === "episode") {
            trakt.processEpisode();
        }
        else if (type === "movie") {
            trakt.processMovie();
        }
    },

    processShow: function() {
        var show_name;
        if (trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("originalTitle") != null) {
            show_name = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("originalTitle");
        }
        else {
            show_name = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("title");
        }
        utils.debug("trakt plugin: Got show name - " + show_name);

        trakt_api.getShow(show_name, function(show_data) {
            var url = "http://trakt.tv" + show_data["url"];
            var rating = show_data["ratings"]["percentage"];

            trakt.insertTraktLink(url, rating);
        });
    },

    processEpisode: function() {
        var season = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("parentIndex");
        var episode = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("index");
        utils.debug("trakt plugin: Fetching grandparent metadata xml");
        var grandparent_id = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("grandparentRatingKey");
        utils.debug("trakt plugin: Grandparent id - " + grandparent_id);

        var grandparent_xml_url = "http://" + trakt.server["address"] + ":" + trakt.server["port"] + "/library/metadata/" + grandparent_id + "?X-Plex-Token=" + trakt.server["access_token"]
        // fetch grandparent xml
        utils.getXML(grandparent_xml_url, function(grandparent_xml) {
            var show_name;
            if (grandparent_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("originalTitle") != null) {
                show_name = grandparent_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("originalTitle");
            }
            else {
                show_name = grandparent_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Directory")[0].getAttribute("title");
            }
            utils.debug("trakt plugin: Got show name - " + show_name);
            utils.debug("trakt plugin: Got season number - " + season);
            utils.debug("trakt plugin: Got episode number - " + episode);

            trakt_api.getShow(show_name, function(show_data) {
                var url = "http://trakt.tv" + show_data["url"] + "/seasons/" + season + "/episodes/" + episode;
                var rating = show_data["ratings"]["percentage"];

                trakt.insertTraktLink(url, rating);
            });
        });
    },

    processMovie: function() {
        var movie_title = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("title");
        utils.debug("trakt plugin: Got movie title - " + movie_title);

        // it's more accurate to search by imdb id, otherwise fall back to movie name
        utils.debug("trakt plugin: Grabbing imdb id");
        var agent = trakt.metadata_xml.getElementsByTagName("MediaContainer")[0].getElementsByTagName("Video")[0].getAttribute("guid");

        var query;
        // check if using the freebase metadata agent
        if (/com\.plexapp\.agents\.imdb/.test(agent)) {
            var imdb_id = agent.match(/^com\.plexapp\.agents\.imdb:\/\/(.+)\?/)[1];
            utils.debug("trakt plugin: imdb id found - " + imdb_id);
            query = imdb_id;
        }
        // check if using the XBMCnfoMoviesImporter agent
        else if (/com\.plexapp\.agents\.xbmcnfo/.test(agent)) {
            var imdb_id = agent.match(/^com\.plexapp\.agents\.xbmcnfo:\/\/(.+)\?/)[1];
            utils.debug("trakt plugin: imdb id found - " + imdb_id);
            query = imdb_id;
        }
        else {
            utils.debug("trakt plugin: imdb id not found, falling back to movie name");
            query = movie_title;
        }

        trakt_api.getMovie(query, function(movie_data) {
            var url = movie_data["url"];
            var rating = movie_data["ratings"]["percentage"];

            trakt.insertTraktLink(url, rating);
        });
    },

    insertTraktLink: function(url, rating) {
        // create trakt link element
        var trakt_container = trakt.constructTraktLink(url, rating);

        // insert trakt link element to bottom of metadata container
        utils.debug("trakt plugin: Inserting trakt container into page");
        document.getElementsByClassName("metadata-right")[0].appendChild(trakt_container);
    },

    constructTraktLink: function(trakt_url, trakt_rating) {
        var logo_url = utils.getResourcePath("trakt/trakt_logo.png");

        var trakt_container_element = document.createElement("div");
        trakt_container_element.setAttribute("id", "trakt-container");

        // construct link
        var trakt_element_link = document.createElement("a");
        trakt_element_link.setAttribute("href", trakt_url);
        trakt_element_link.setAttribute("target", "_blank");

        // construct logo
        var trakt_element_img = document.createElement("img");
        trakt_element_img.setAttribute("src", logo_url);

        trakt_element_link.appendChild(trakt_element_img);

        // construct rating
        var trakt_rating_element = document.createElement("div");
        trakt_rating_element.setAttribute("id", "trakt-rating");
        var rating_text = document.createTextNode(trakt_rating + "%");

        // construct rating image
        var trakt_rating_image = document.createElement("img");
        trakt_rating_image.setAttribute("src", utils.getResourcePath("trakt/trakt_love.png"));
        trakt_rating_image.setAttribute("id", "trakt-rating-image");

        trakt_rating_element.appendChild(trakt_rating_image);
        trakt_rating_element.appendChild(rating_text);

        trakt_container_element.appendChild(trakt_element_link);
        trakt_container_element.appendChild(trakt_rating_element);

        return trakt_container_element;
    }
}