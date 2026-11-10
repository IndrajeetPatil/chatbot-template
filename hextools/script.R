library(hexSticker)
library(magick)
library(showtext)

google_font_name <- "Rubik"
font_add_google(google_font_name)

showtext_auto()

img <- image_read("hextools/data.svg", density = 192)

sticker(
    img,
    package = "chatbot-template",
    p_color = "#263238",
    p_family = google_font_name,
    p_size = 24,
    p_x = 1,
    p_y = 1.42,
    s_x = 1,
    s_y = 0.85,
    s_width = 1,
    s_height = 0.75,
    h_color = "#455A64",
    filename = "docs/images/logo.png",
    h_fill = "white",
    url = "https://github.com/IndrajeetPatil/chatbot-template",
    u_x = 0.97,
    u_size = 5.5,
    u_color = "grey",
    dpi = 600
)
