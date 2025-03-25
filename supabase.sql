CREATE TABLE users (
  id UUID PRIMARY KEY,
  role TEXT CHECK (role IN ('business', 'freelancer', 'admin')),
  phone TEXT,
  email TEXT,
  name TEXT,
  preferred_routes TEXT
);

CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  business_id UUID REFERENCES users(id),
  script TEXT,
  route TEXT,
  budget DECIMAL,
  status TEXT CHECK (status IN ('pending', 'active', 'completed'))
);

CREATE TABLE gigs (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id),
  freelancer_id UUID REFERENCES users(id),
  video_url TEXT,
  status TEXT CHECK (status IN ('assigned', 'submitted', 'verified', 'rejected'))
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES campaigns(id),
  gig_id INTEGER REFERENCES gigs(id),
  amount DECIMAL,
  transaction_id TEXT,
  status TEXT,
  freelancer_id UUID REFERENCES users(id)
);

CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  name TEXT,
  coordinates JSON,
  rate DECIMAL
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  business_id UUID REFERENCES users(id),
  content TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);