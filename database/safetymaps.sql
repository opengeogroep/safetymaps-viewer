set session authorization <user>;

create schema safetymaps;

create table safetymaps.settings(name varchar primary key, value text);
