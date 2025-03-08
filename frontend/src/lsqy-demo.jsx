import React, { useEffect, useState } from 'react';
import axios from 'axios';

const lsqyConfig = {
    API_KEY: import.meta.env.VITE_LSQY_API_KEY ,
    URL: "https://api.lemonsqueezy.com/v1",
};

const headers = {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${lsqyConfig.API_KEY}`,
};

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getProducts = async () => {
            try {
                const response = await axios.get(`${lsqyConfig.URL}/products`, { headers });
                setProducts(response.data.data); // Set the products state
            } catch (error) {
                setError(error.message); // Set the error state
            } finally {
                setLoading(false); // Set loading to false
            }
        };

        getProducts();
    }, []);

    if (loading) {
        return <div>Loading...</div>; // Show loading state
    }

    if (error) {
        return <div>Error: {error}</div>; // Show error message
    }

    return (
        <div id="books-container">
            {products.map((prod) => {
                const item = prod.attributes;
                return (
                    <div className="book-preview" key={prod.id}>
                        <img src={item.large_thumb_url} alt={item.name} />
                        <div className="book-details">
                            <p className="book-title">{item.name}</p>
                            <small>{item.description}</small>
                            <strong className="book-price">{item.price_formatted}</strong>
                            <a href={item.buy_now_url} target="_blank" rel="noopener noreferrer">Buy Now</a>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProductList;
