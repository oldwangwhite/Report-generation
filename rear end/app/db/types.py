from sqlalchemy import BigInteger, Integer

# MySQL needs BIGINT to match the existing schema, while SQLite only
# autoincrements columns declared as INTEGER PRIMARY KEY.
IdType = BigInteger().with_variant(Integer, "sqlite")
